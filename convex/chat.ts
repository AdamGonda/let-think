"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  preProcess,
  postProcess,
  extractConceptGraph,
  type ConceptGraph,
} from "./chatPipeline";
import type { ModelMessage } from "ai";

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
  },
  handler: async (ctx, { messages, sessionId, userContent }) => {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 0. Fetch existing concept graph for this session
    const existingGraph: ConceptGraph | null =
      (await ctx.runQuery(api.sessions.getConceptGraph, { sessionId })) ?? null;

    // 1. Convert and pre-process messages
    let modelMessages = toModelMessages(messages);
    modelMessages = await preProcess(modelMessages, {
      sessionId,
      conceptGraph: existingGraph,
      meta: {},
    });

    // 2. Call LLM
    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
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
      finalGraph = extractedGraph;
      await ctx.runMutation(api.sessions.updateConceptGraph, {
        sessionId,
        conceptGraph: finalGraph,
      });
    }

    return { content: processedContent, conceptGraph: finalGraph };
  },
});
