declare const process: { env: Record<string, string | undefined> };

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { generateText } from "ai";
import type { ModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { preProcess, postProcess } from "./chatPipeline";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const http = httpRouter();

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

// Handle CORS preflight
http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

/**
 * AI chat endpoint.
 * Pipeline: preProcess(messages) -> LLM -> postProcess(response) -> return
 *
 * Request body: { messages: Array<{ role, content }>, sessionId?: string }
 * Response: { content: string }
 */
http.route({
  path: "/api/chat",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = (await request.json()) as {
      messages?: Array<{ role: string; content?: string }>;
      sessionId?: string;
    };
    const messages = body.messages ?? [];
    const sessionId = body.sessionId;

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

    // 3. Post-process the response
    const processedContent = await postProcess(result.text, {
      sessionId,
      meta: {},
    });

    return new Response(
      JSON.stringify({ content: processedContent }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

export default http;
