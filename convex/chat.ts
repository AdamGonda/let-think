"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
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

/** Derive a one-word summary from user input for display between batches. */
function summarizeToWord(text: string): string {
  const stopWords = new Set([
    "what", "how", "is", "are", "the", "a", "an", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "why", "when", "where", "who", "which",
  ]);
  const words = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const word = words[0] ?? text.trim().split(/\s+/)[0];
  if (!word) return "—";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

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
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.optional(v.string()),
      })
    ),
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
  },
  handler: async (ctx, { messages, sessionId, userContent, selectedNodeContext }): Promise<{ content: string; conceptGraph: ConceptGraph | null }> => {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    // 0. Fetch existing concept graph for this session
    const existingGraph: ConceptGraph | null =
      (await ctx.runQuery(api.sessions.getConceptGraph, { sessionId })) ?? null;

    // 1. Convert and pre-process messages
    let modelMessages = toModelMessages(messages);
    modelMessages = await preProcess(modelMessages, {
      sessionId,
      conceptGraph: existingGraph,
      selectedNodes: selectedNodeContext,
      meta: {},
    });

    // 2. Call LLM
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

    // 5. Persist messages and update graph
    await ctx.runMutation(api.sessions.addMessages, {
      sessionId,
      userContent,
      assistantContent: processedContent,
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
                promptSummary: summarizeToWord(userContent),
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
