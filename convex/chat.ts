"use node";

import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { generateText, streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  preProcess,
  postProcess,
  extractConceptGraph,
  buildConceptGraphPromptWindow,
  createConceptStreamParseState,
  flushConceptStreamParseState,
  parseConceptStreamChunk,
  buildReferencedConceptsSystemNote,
  type ConceptGraph,
  type ConceptStreamEvent,
} from "./chatPipeline";
type ConceptNode = ConceptGraph["nodes"][number];
import type { ModelMessage } from "ai";
import {
  BATCH_PROMPT_SUMMARY_MAX_CHARS,
  CONCEPT_GRAPH_PROMPT_BATCH_WINDOW,
  PROMPT_SUMMARY_INPUT_MAX_CHARS,
  PROMPT_SUMMARY_OUTPUT_MAX_CHARS,
} from "./constants";
import { modelConfig } from "./modelConfig";
import { isConceptEmbeddingsSyncEnabled } from "./featureFlags";

type GenerationUsageMetrics = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

const TOKEN_WARN_THRESHOLD = 20_000;
const TOKEN_CRITICAL_THRESHOLD = 50_000;

type TokenAlertLevel = "normal" | "warn" | "critical";

function coerceFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatGenerationUsageLog(
  usage: GenerationUsageMetrics,
  context: {
    sessionId: string;
    userId: string;
    model: string;
  }
): Record<string, string | number | null> {
  return {
    event: "generation_completed",
    sessionId: context.sessionId,
    userId: context.userId,
    model: context.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

function classifyTokenAlertLevel(totalTokens: number | null): TokenAlertLevel {
  if (totalTokens == null) return "normal";
  if (totalTokens > TOKEN_CRITICAL_THRESHOLD) return "critical";
  if (totalTokens > TOKEN_WARN_THRESHOLD) return "warn";
  return "normal";
}

async function capturePosthogGenerationEvent(
  usage: GenerationUsageMetrics,
  context: {
    sessionId: string;
    userId: string;
    model: string;
    messageCount: number;
    selectedNodeCount: number;
  }
): Promise<void> {
  const apiKey = (
    process.env.POSTHOG_PROJECT_API_KEY ??
    process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
  )?.trim();
  const host = (
    process.env.POSTHOG_HOST ?? process.env.VITE_PUBLIC_POSTHOG_HOST
  )?.trim();
  if (!apiKey || !host) {
    console.warn(
      "[posthog] skip generation_completed: Convex env missing or empty. Set POSTHOG_PROJECT_API_KEY and POSTHOG_HOST on this deployment (or VITE_PUBLIC_POSTHOG_* fallbacks).",
      { hasApiKey: Boolean(apiKey), hasHost: Boolean(host) }
    );
    return;
  }

  const captureUrl = `${host.replace(/\/+$/, "")}/capture/`;
  const nowIso = new Date().toISOString();
  const tokenAlertLevel = classifyTokenAlertLevel(usage.totalTokens);
  const payload = {
    api_key: apiKey,
    event: "generation_completed",
    distinct_id: context.userId,
    timestamp: nowIso,
    properties: {
      session_id: context.sessionId,
      model: context.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      token_alert_level: tokenAlertLevel,
      token_warn_threshold: TOKEN_WARN_THRESHOLD,
      token_critical_threshold: TOKEN_CRITICAL_THRESHOLD,
      message_count: context.messageCount,
      selected_node_count: context.selectedNodeCount,
      source: "convex_chat_send",
    },
  };

  try {
    const response = await fetch(captureUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.warn(
        "[posthog] Failed to capture generation_completed",
        response.status,
        response.statusText,
        captureUrl,
        detail || "(empty body)"
      );
    }
  } catch (error) {
    console.warn("[posthog] Failed to send generation_completed", error);
  }
}

function makeUniqueNodeId(candidate: string, usedIds: Set<string>): string {
  const trimmed = candidate.trim() || "concept";
  if (!usedIds.has(trimmed)) return trimmed;
  let suffix = 2;
  let next = `${trimmed}-${suffix}`;
  while (usedIds.has(next)) {
    suffix += 1;
    next = `${trimmed}-${suffix}`;
  }
  return next;
}

function normalizeIncomingNodes(
  incomingNodes: ConceptNode[],
  existingNodes: ConceptNode[]
): ConceptNode[] {
  const usedIds = new Set(existingNodes.map((n) => n.id));
  return incomingNodes.map((node) => {
    const uniqueId = makeUniqueNodeId(node.id, usedIds);
    usedIds.add(uniqueId);
    return {
      ...node,
      id: uniqueId,
    };
  });
}

type BatchMeta = {
  id: string;
  promptSummary?: string;
  description?: string;
};

function mergeConceptGraphIncrement(
  currentGraph: ConceptGraph | null,
  incomingNodes: ConceptNode[],
  incomingEdges: ConceptGraph["edges"],
  batchMeta: BatchMeta,
  globalIdRemap: Map<string, string>
): { graph: ConceptGraph; changed: boolean; addedNodes: ConceptNode[] } {
  const existingNodes: ConceptNode[] = currentGraph?.nodes ?? [];
  const localIdRemap = new Map<string, string>();
  const existingNodeIds = new Set(existingNodes.map((n) => n.id));
  const nodesToNormalize: ConceptNode[] = [];

  for (const node of incomingNodes) {
    const mapped = globalIdRemap.get(node.id);
    if (mapped && existingNodeIds.has(mapped)) {
      localIdRemap.set(node.id, mapped);
      continue;
    }
    if (existingNodeIds.has(node.id)) {
      // Repeated node from stream/fallback reconciliation: map it to existing id.
      localIdRemap.set(node.id, node.id);
      globalIdRemap.set(node.id, node.id);
      continue;
    }
    nodesToNormalize.push(node);
  }

  const normalizedIncomingNodes = normalizeIncomingNodes(nodesToNormalize, existingNodes);
  for (let i = 0; i < nodesToNormalize.length; i += 1) {
    const original = nodesToNormalize[i]?.id;
    const normalized = normalizedIncomingNodes[i]?.id;
    if (!original || !normalized) continue;
    localIdRemap.set(original, normalized);
    globalIdRemap.set(original, normalized);
  }

  const newNodes = normalizedIncomingNodes.filter((n) => !existingNodeIds.has(n.id));
  const newNodeIds = newNodes.map((n) => n.id);

  const remappedIncomingEdges = incomingEdges.map((edge) => ({
    source: localIdRemap.get(edge.source) ?? globalIdRemap.get(edge.source) ?? edge.source,
    target: localIdRemap.get(edge.target) ?? globalIdRemap.get(edge.target) ?? edge.target,
  }));
  const existingEdgeKeys = new Set(
    (currentGraph?.edges ?? []).map((e) => `${e.source}→${e.target}`)
  );
  const newEdges = remappedIncomingEdges.filter(
    (edge) => !existingEdgeKeys.has(`${edge.source}→${edge.target}`)
  );

  const existingBatches = currentGraph?.batches ?? [];
  let batches = existingBatches;
  if (newNodeIds.length > 0) {
    const existingBatchIndex = existingBatches.findIndex((b) => b.id === batchMeta.id);
    if (existingBatchIndex >= 0) {
      const existingBatch = existingBatches[existingBatchIndex];
      const mergedNodeIds = Array.from(
        new Set([...(existingBatch?.nodeIds ?? []), ...newNodeIds])
      );
      batches = existingBatches.map((batch, index) =>
        index === existingBatchIndex
          ? {
              ...batch,
              nodeIds: mergedNodeIds,
              ...(batchMeta.promptSummary ? { promptSummary: batchMeta.promptSummary } : {}),
              ...(batchMeta.description ? { description: batchMeta.description } : {}),
            }
          : batch
      );
    } else {
      batches = [
        ...existingBatches,
        {
          id: batchMeta.id,
          nodeIds: newNodeIds,
          ...(batchMeta.promptSummary ? { promptSummary: batchMeta.promptSummary } : {}),
          ...(batchMeta.description ? { description: batchMeta.description } : {}),
        },
      ];
    }
  }

  const changed = newNodes.length > 0 || newEdges.length > 0;
  return {
    graph: {
      nodes: [...existingNodes, ...newNodes],
      edges: [...(currentGraph?.edges ?? []), ...newEdges],
      ...(batches.length > 0 ? { batches } : {}),
    },
    changed,
    addedNodes: newNodes,
  };
}

/** Generate a short topic/summary from user prompt via AI – fits in max 2 lines above history bubbles. */
async function generatePromptSummary(
  userContent: string,
  model: ReturnType<typeof createGoogleGenerativeAI>
): Promise<string> {
  const trimmed = userContent.trim();
  if (!trimmed) return "";
  const prompt = `Summarize the following in one short phrase (max 8–12 words). Reply with only that phrase, nothing else.

User prompt:
${trimmed.slice(0, PROMPT_SUMMARY_INPUT_MAX_CHARS)}`;

  const modelsToTry = modelConfig.titleAndHeaderModels;
  for (const modelId of modelsToTry) {
    try {
      const { text } = await generateText({
        model: model(modelId),
        prompt,
      });
      const raw = text
        .trim()
        .replace(/\n+/g, " ")
        .slice(0, PROMPT_SUMMARY_OUTPUT_MAX_CHARS);
      const sentence = raw.replace(/^["'`]\s*|["'`]\s*$/g, "").trim();
      if (sentence && sentence !== "—") {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      }
    } catch (err) {
      console.warn(`[generatePromptSummary] ${modelId} failed:`, err);
    }
  }
  return "";
}

/** Runs when a user message is inserted – generates AI summary and patches the message. */
export const generateTopicForMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    userContent: v.string(),
  },
  handler: async (
    ctx,
    { messageId, userContent }
  ): Promise<void> => {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    const topic = await generatePromptSummary(userContent, google);
    if (topic) {
      await ctx.runMutation(internal.sessions.updateMessageTopic, {
        messageId,
        topic,
      });
    }
  },
});

function toModelMessages(
  messages: Array<{ role: string; content?: string }>
): ModelMessage[] {
  return messages
    .filter(
      (m) =>
        m.role === "user" || m.role === "assistant" || m.role === "system"
    )
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content ?? "",
    }));
}

/**
 * AI chat action.
 * Pipeline: preProcess(messages) -> LLM -> postProcess(response) -> addMessages -> return
 */
export const send = action({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    selectedNodeContext: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          description: v.optional(v.string()),
        })
      )
    ),
    mentions: v.optional(
      v.array(
        v.object({
          start: v.number(),
          end: v.number(),
          conceptId: v.string(),
          name: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, { sessionId, userContent, selectedNodeContext, mentions }): Promise<{ content: string; conceptGraph: ConceptGraph | null }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");

    const bundle = await ctx.runQuery(internal.sessions.internalLoadSessionForChatSend, {
      sessionId,
      userId,
    });
    if (!bundle) throw new Error("Session not found or access denied");

    const { existingGraph: loadedGraph, messages: storedMessages } = bundle;
    const existingGraph: ConceptGraph | null = loadedGraph;

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    // 0–1. Build model messages from DB + this user turn (avoids huge client payloads)
    let modelMessages = toModelMessages([
      ...storedMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userContent },
    ]);
    const promptConceptGraph = buildConceptGraphPromptWindow(
      existingGraph,
      CONCEPT_GRAPH_PROMPT_BATCH_WINDOW
    );
    modelMessages = await preProcess(modelMessages, {
      sessionId,
      conceptGraph: promptConceptGraph,
      selectedNodes: selectedNodeContext,
      meta: {},
    });

    // 2. Call LLM using streaming so concept events can be merged progressively
    let generationUsage: GenerationUsageMetrics = {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
    const streamResult = streamText({
      model: google(modelConfig.mainContextGraphModel),
      system: "You are a helpful assistant.",
      messages: modelMessages,
      onFinish: ({ usage }) => {
        generationUsage = {
          inputTokens: coerceFiniteNumber(usage?.inputTokens),
          outputTokens: coerceFiniteNumber(usage?.outputTokens),
          totalTokens: coerceFiniteNumber(usage?.totalTokens),
        };
      },
    });

    const batchMeta: BatchMeta = {
      id: `batch-${Date.now()}`,
      promptSummary:
        userContent.slice(0, BATCH_PROMPT_SUMMARY_MAX_CHARS).trim() +
          (userContent.length > BATCH_PROMPT_SUMMARY_MAX_CHARS ? "…" : "") ||
        undefined,
      description: userContent.trim() || undefined,
    };
    const streamParseState = createConceptStreamParseState();
    const globalIdRemap = new Map<string, string>();
    const nodesAddedInThisTurn = new Map<string, ConceptNode>();
    let bufferedEvents: ConceptStreamEvent[] = [];
    let finalGraph: ConceptGraph | null = existingGraph;
    let rawModelText = "";
    let displayText = "";
    let lastFlushAt = Date.now();
    // Flush each parsed concept event right away so tail cards don't lag.
    const STREAM_FLUSH_EVENT_COUNT = 1;
    const STREAM_FLUSH_MS = 100;

    const flushBufferedEvents = async () => {
      if (bufferedEvents.length === 0) return;
      const nodeEvents = bufferedEvents.filter(
        (event): event is Extract<ConceptStreamEvent, { type: "node" }> =>
          event.type === "node"
      );
      const edgeEvents = bufferedEvents.filter(
        (event): event is Extract<ConceptStreamEvent, { type: "edge" }> =>
          event.type === "edge"
      );
      const incomingNodes = nodeEvents.map((event) => event.node);
      const incomingEdges = edgeEvents.map((event) => event.edge);
      bufferedEvents = [];
      const merged = mergeConceptGraphIncrement(
        finalGraph,
        incomingNodes,
        incomingEdges,
        batchMeta,
        globalIdRemap
      );
      finalGraph = merged.graph;
      for (const node of merged.addedNodes) {
        nodesAddedInThisTurn.set(node.id, node);
      }
      if (merged.changed) {
        await ctx.runMutation(api.sessions.updateConceptGraph, {
          sessionId,
          conceptGraph: finalGraph,
        });
      }
      lastFlushAt = Date.now();
    };

    for await (const textPart of streamResult.textStream) {
      rawModelText += textPart;
      const parsed = parseConceptStreamChunk(streamParseState, textPart);
      bufferedEvents.push(...parsed.events);
      displayText += parsed.displayChunk;
      const now = Date.now();
      const shouldFlush =
        bufferedEvents.length >= STREAM_FLUSH_EVENT_COUNT ||
        (bufferedEvents.length > 0 && now - lastFlushAt >= STREAM_FLUSH_MS);
      if (shouldFlush) {
        await flushBufferedEvents();
      }
    }
    await flushBufferedEvents();
    displayText += flushConceptStreamParseState(streamParseState);

    // 3. Final fallback extraction from full text for malformed stream events
    const extractedGraph = extractConceptGraph(rawModelText);
    if (extractedGraph) {
      const merged = mergeConceptGraphIncrement(
        finalGraph,
        extractedGraph.nodes,
        extractedGraph.edges,
        batchMeta,
        globalIdRemap
      );
      finalGraph = merged.graph;
      for (const node of merged.addedNodes) {
        nodesAddedInThisTurn.set(node.id, node);
      }
      if (merged.changed) {
        await ctx.runMutation(api.sessions.updateConceptGraph, {
          sessionId,
          conceptGraph: finalGraph,
        });
      }
    }
    const addedNodes = Array.from(nodesAddedInThisTurn.values());
    if (addedNodes.length > 0 && isConceptEmbeddingsSyncEnabled()) {
      await ctx.runMutation(internal.conceptEmbeddings.enqueueConceptNodesForEmbedding, {
        sessionId,
        userId,
        batchId: batchMeta.id,
        nodes: addedNodes,
      });
    } else if (addedNodes.length > 0) {
      console.info("[concept-embeddings] enqueue.skipped.feature_flag_disabled", {
        sessionId,
        batchId: batchMeta.id,
        skippedNodeCount: addedNodes.length,
      });
    }

    // 4. Post-process visible assistant text
    const processedContent = await postProcess(displayText || rawModelText, {
      sessionId,
      meta: {},
    });

    // 5. Persist messages (addMessages schedules topic generation on insert)
    await ctx.runMutation(api.sessions.addMessages, {
      sessionId,
      userContent,
      assistantContent: processedContent,
      mentions,
    });

    console.info(
      "[generation]",
      formatGenerationUsageLog(generationUsage, {
        sessionId,
        userId,
        model: modelConfig.mainContextGraphModel,
      })
    );
    await capturePosthogGenerationEvent(generationUsage, {
      sessionId,
      userId,
      model: modelConfig.mainContextGraphModel,
      messageCount: modelMessages.length,
      selectedNodeCount: selectedNodeContext?.length ?? 0,
    });
    const tokenAlertLevel = classifyTokenAlertLevel(generationUsage.totalTokens);
    if (tokenAlertLevel === "critical") {
      console.error("[generation] token usage exceeded CRITICAL threshold", {
        sessionId,
        userId,
        totalTokens: generationUsage.totalTokens,
        criticalThreshold: TOKEN_CRITICAL_THRESHOLD,
      });
    } else if (tokenAlertLevel === "warn") {
      console.warn("[generation] token usage exceeded WARN threshold", {
        sessionId,
        userId,
        totalTokens: generationUsage.totalTokens,
        warnThreshold: TOKEN_WARN_THRESHOLD,
      });
    }

    return { content: processedContent, conceptGraph: finalGraph };
  },
});

const selectedNodeContextValidator = v.optional(
  v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  )
);

const mentionSpanValidator = v.optional(
  v.array(
    v.object({
      start: v.number(),
      end: v.number(),
      conceptId: v.string(),
      name: v.string(),
    })
  )
);

/**
 * Plain chat-lane send: conversation is `chatMessages` only (no concept graph write).
 */
export const sendChat = action({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    selectedNodeContext: selectedNodeContextValidator,
    mentions: mentionSpanValidator,
  },
  returns: v.object({ content: v.string() }),
  handler: async (
    ctx,
    { sessionId, userContent, selectedNodeContext, mentions }
  ): Promise<{ content: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");

    const bundle = await ctx.runQuery(
      internal.sessions.internalLoadSessionForChatLaneSend,
      { sessionId, userId },
    );
    if (!bundle) throw new Error("Session not found or access denied");

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const conceptNote = buildReferencedConceptsSystemNote(selectedNodeContext);
    const modelMessages = toModelMessages([
      ...(conceptNote
        ? [{ role: "system" as const, content: conceptNote }]
        : []),
      ...bundle.messages,
      { role: "user" as const, content: userContent },
    ]);

    const { assistantMessageId } = await ctx.runMutation(
      internal.sessions.startChatTurn,
      { sessionId, userId, userContent, mentions },
    );

    let generationUsage: GenerationUsageMetrics = {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
    const streamResult = streamText({
      model: google(modelConfig.mainContextGraphModel),
      system:
        "You are a helpful assistant. Format replies in Markdown (headings, lists, bold, and code when useful).",
      messages: modelMessages,
      onFinish: ({ usage }) => {
        generationUsage = {
          inputTokens: coerceFiniteNumber(usage?.inputTokens),
          outputTokens: coerceFiniteNumber(usage?.outputTokens),
          totalTokens: coerceFiniteNumber(usage?.totalTokens),
        };
      },
    });

    let displayText = "";
    let lastFlushAt = 0;
    const STREAM_FLUSH_MS = 50;
    const flushAssistant = async () => {
      await ctx.runMutation(internal.sessions.patchChatMessage, {
        messageId: assistantMessageId,
        userId,
        content: displayText,
      });
      lastFlushAt = Date.now();
    };

    try {
      for await (const textPart of streamResult.textStream) {
        displayText += textPart;
        if (Date.now() - lastFlushAt >= STREAM_FLUSH_MS) {
          await flushAssistant();
        }
      }
    } catch (err) {
      if (!displayText.trim()) {
        displayText = "Something went wrong. Please try again.";
        await flushAssistant();
      }
      throw err;
    }
    const content = displayText.trim();
    await ctx.runMutation(internal.sessions.patchChatMessage, {
      messageId: assistantMessageId,
      userId,
      content,
    });

    console.info(
      "[generation]",
      formatGenerationUsageLog(generationUsage, {
        sessionId,
        userId,
        model: modelConfig.mainContextGraphModel,
      }),
    );
    await capturePosthogGenerationEvent(generationUsage, {
      sessionId,
      userId,
      model: modelConfig.mainContextGraphModel,
      messageCount: modelMessages.length,
      selectedNodeCount: selectedNodeContext?.length ?? 0,
    });

    return { content };
  },
});
