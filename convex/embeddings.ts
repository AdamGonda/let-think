"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Doc, Id } from "./_generated/dataModel";

const MESSAGE_SUMMARY_CHARS = 500;

function buildSessionSummaryText(
  session: Doc<"sessions">,
  messages: Doc<"messages">[]
): string {
  const parts: string[] = [];

  parts.push(session.title);

  const graph = session.conceptGraph;
  if (graph) {
    for (const node of graph.nodes) {
      parts.push(node.name);
      if (node.description) parts.push(node.description);
    }
    if (graph.batches) {
      for (const batch of graph.batches) {
        if (batch.promptSummary) parts.push(batch.promptSummary);
        if (batch.description) parts.push(batch.description);
      }
    }
  }

  if (parts.length <= 1 && messages.length > 0) {
    const text = messages
      .map((m) => m.content)
      .join(" ")
      .trim();
    if (text) {
      parts.push(text.slice(0, MESSAGE_SUMMARY_CHARS));
    }
  }

  return parts.filter(Boolean).join("\n\n") || session.title;
}

export const upsert = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.runQuery(api.sessions.get, { sessionId });
    const messages = await ctx.runQuery(api.sessions.getMessages, {
      sessionId,
    });

    if (!session) return;

    const summaryText = buildSessionSummaryText(session, messages);

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const { embedding } = await embed({
      model: google.embedding("gemini-embedding-001"),
      value: summaryText,
    });

    await ctx.runMutation(internal.embeddingsMutations.upsertMutation, {
      sessionId,
      embedding,
      projectId: session.projectId,
    });
  },
});

export const search = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { query, limit = 10, projectId }) => {
    if (!query.trim()) return { sessions: [], scores: [] };

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const { embedding } = await embed({
      model: google.embedding("gemini-embedding-001"),
      value: query.trim(),
    });

    const results = await ctx.vectorSearch("sessionEmbeddings", "by_embedding", {
      vector: embedding,
      limit: Math.min(256, Math.max(1, limit)),
      ...(projectId !== undefined && {
        filter: (q: { eq: (field: "projectId", value: Id<"projects">) => unknown }) =>
          q.eq("projectId", projectId),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const sessions: Doc<"sessions">[] = [];
    const scores: number[] = [];

    for (const result of results) {
      const embedDoc = await ctx.runQuery(
        internal.embeddingsQueries.getEmbeddingDoc,
        { embeddingId: result._id }
      );
      if (!embedDoc) continue;
      const session = await ctx.runQuery(api.sessions.get, {
        sessionId: embedDoc.sessionId,
      });
      if (session) {
        sessions.push(session);
        scores.push(result._score);
      }
    }

    return { sessions, scores };
  },
});

export const backfill = action({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.runQuery(api.sessions.list);
    for (const session of sessions) {
      const messages = await ctx.runQuery(api.sessions.getMessages, {
        sessionId: session._id,
      });
      const hasContent =
        (session.conceptGraph?.nodes?.length ?? 0) > 0 || messages.length > 0;
      if (hasContent) {
        await ctx.runAction(api.embeddings.upsert, { sessionId: session._id });
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  },
});
