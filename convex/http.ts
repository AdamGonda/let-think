import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const http = httpRouter();

// Handle CORS preflight
http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

/**
 * AI chat endpoint - compatible with Vercel AI SDK useChat.
 * Uses Claude Sonnet 4.6 by default.
 * Set ANTHROPIC_API_KEY in Convex dashboard (Settings > Environment Variables).
 */
http.route({
  path: "/api/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json()) as {
      messages?: Array<{ role: string; content?: string; parts?: unknown[] }>;
    };
    const messages = body.messages ?? [];

    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: "You are a helpful assistant.",
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse({
      headers: CORS_HEADERS,
    });
  }),
});

export default http;
