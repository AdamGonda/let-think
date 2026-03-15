"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { preProcess, postProcess } from "./chatPipeline";
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

    // 1. Convert and pre-process messages
    let modelMessages = toModelMessages(messages);
    modelMessages = await preProcess(modelMessages, {
      sessionId,
      meta: {},
    });

    // 2. Call LLM
    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: "You are a helpful assistant.",
      messages: modelMessages,
    });

    console.log(result.text);

    // 3. Post-process the response
    const processedContent = await postProcess(result.text, {
      sessionId,
      meta: {},
    });

    // 4. Persist messages via mutation
    await ctx.runMutation(api.sessions.addMessages, {
      sessionId,
      userContent,
      assistantContent: processedContent,
    });

    return { content: processedContent };
  },
});
