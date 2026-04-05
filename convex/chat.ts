"use node";

import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  preProcess,
  postProcess,
  extractConceptGraph,
  type ConceptGraph,
} from "./chatPipeline";
type ConceptNode = ConceptGraph["nodes"][number];
import type { ModelMessage } from "ai";
import {
  BATCH_PROMPT_SUMMARY_MAX_CHARS,
  PROMPT_SUMMARY_INPUT_MAX_CHARS,
  PROMPT_SUMMARY_OUTPUT_MAX_CHARS,
} from "./constants";

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

  // Use main model first (known to work); fall back to flash models if needed
  const modelsToTry = ["gemini-3-flash-preview"] //"gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
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
  handler: async (ctx, { messageId, userContent }) => {
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
    modelMessages = await preProcess(modelMessages, {
      sessionId,
      conceptGraph: existingGraph,
      selectedNodes: selectedNodeContext,
      meta: {},
    });

    // 2. Call LLM (main response); topic is generated separately when message is inserted
    const result = await generateText({
      model: google("gemini-3.1-pro-preview"),
      system: "You are a helpful assistant.",
      messages: modelMessages,
    });

    // 3. Extract concept graph from raw response (before stripping)
    const extractedGraph = extractConceptGraph(result.text);

    // 4. Post-process the response (strips graph block for display)
    const processedContent = await postProcess(result.text, {
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

    let finalGraph: ConceptGraph | null = existingGraph;
    if (extractedGraph && extractedGraph.nodes.length > 0) {
      const existingNodes: ConceptNode[] = existingGraph?.nodes ?? [];
      const existingNodeIds: Set<string> = new Set(existingNodes.map((n: ConceptNode) => n.id));
      const newNodeIds: string[] = extractedGraph.nodes
        .filter((n: ConceptNode) => !existingNodeIds.has(n.id))
        .map((n: ConceptNode) => n.id);
      const existingBatches = existingGraph?.batches ?? [];
      const batches: Array<{
        id: string;
        nodeIds: string[];
        promptSummary?: string;
        description?: string;
      }> =
        newNodeIds.length > 0
          ? [
              ...existingBatches,
              {
                id: `batch-${Date.now()}`,
                nodeIds: newNodeIds,
                promptSummary:
                  userContent.slice(0, BATCH_PROMPT_SUMMARY_MAX_CHARS).trim() +
                    (userContent.length > BATCH_PROMPT_SUMMARY_MAX_CHARS
                      ? "…"
                      : "") || undefined,
                description: userContent.trim() || undefined,
              },
            ]
          : existingBatches;
      // Merge: keep existing nodes + add new ones (don't replace with extractedGraph!)
      const mergedNodes: ConceptNode[] = [
        ...existingNodes,
        ...extractedGraph.nodes.filter((n: ConceptNode) => !existingNodeIds.has(n.id)),
      ];
      const existingEdgeKeys = new Set(
        (existingGraph?.edges ?? []).map((e) => `${e.source}→${e.target}`)
      );
      const mergedEdges = [
        ...(existingGraph?.edges ?? []),
        ...extractedGraph.edges.filter(
          (e) => !existingEdgeKeys.has(`${e.source}→${e.target}`)
        ),
      ];
      finalGraph = {
        nodes: mergedNodes,
        edges: mergedEdges,
        batches: batches.length > 0 ? batches : undefined,
      };
      await ctx.runMutation(api.sessions.updateConceptGraph, {
        sessionId,
        conceptGraph: finalGraph,
      });
    }

    return { content: processedContent, conceptGraph: finalGraph };
  },
});
