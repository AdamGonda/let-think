import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { embedTextWithGoogle } from "./lib/googleEmbed";
import {
  SEARCH_EMBEDDING_DIMENSIONS,
  SEARCH_MIN_QUERY_LENGTH,
  shouldKeepSearchHit,
} from "./lib/searchDocumentsCore";

const searchHitValidator = v.object({
  kind: v.union(v.literal("note"), v.literal("chat"), v.literal("idea")),
  title: v.string(),
  snippet: v.string(),
  fileId: v.id("files"),
  sessionId: v.union(v.id("sessions"), v.null()),
  projectId: v.union(v.id("projects"), v.null()),
  chatSessionId: v.union(v.id("chatSessions"), v.null()),
  nodeId: v.union(v.string(), v.null()),
  batchIndex: v.union(v.number(), v.null()),
  score: v.number(),
  reason: v.union(v.literal("contains"), v.literal("similar")),
  matchedTerms: v.array(v.string()),
});

async function embedForSearch(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for embeddings");
  }
  return await embedTextWithGoogle({
    text,
    apiKey,
    taskType,
    dimensions: SEARCH_EMBEDDING_DIMENSIONS,
    configuredModel: process.env.GOOGLE_EMBEDDING_MODEL,
  });
}

export const processSearchDocuments = internalAction({
  args: { ids: v.array(v.id("searchDocuments")) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    const rows = await ctx.runQuery(internal.searchDocuments.getByIds, { ids });
    for (const row of rows) {
      try {
        const embedding = await embedForSearch(
          row.embeddingText,
          "RETRIEVAL_DOCUMENT",
        );
        await ctx.runMutation(internal.searchDocuments.patchEmbedding, {
          id: row._id,
          embedding,
        });
      } catch (error) {
        console.error("[search-documents] embed.failed", {
          id: row._id,
          kind: row.kind,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return null;
  },
});

type SearchHit = {
  kind: "note" | "chat" | "idea";
  title: string;
  snippet: string;
  fileId: Id<"files">;
  sessionId: Id<"sessions"> | null;
  projectId: Id<"projects"> | null;
  chatSessionId: Id<"chatSessions"> | null;
  nodeId: string | null;
  batchIndex: number | null;
  score: number;
  reason: "contains" | "similar";
  matchedTerms: string[];
};

export const search = action({
  args: { query: v.string() },
  returns: v.object({
    hits: v.array(searchHitValidator),
    indexing: v.boolean(),
  }),
  handler: async (ctx, { query }): Promise<{
    hits: SearchHit[];
    indexing: boolean;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      return { hits: [], indexing: false };
    }

    const hasAny = await ctx.runQuery(internal.searchDocuments.hasAnyForUser, {
      userId,
    });
    let indexing = false;
    if (!hasAny) {
      indexing = true;
      await ctx.runMutation(internal.searchDocuments.enqueueBackfillForUser, {
        userId,
      });
    }

    const vector = await embedForSearch(trimmed, "RETRIEVAL_QUERY");
    const neighbors = await ctx.vectorSearch("searchDocuments", "by_embedding", {
      vector,
      limit: 16,
      filter: (q) => q.eq("userId", userId),
    });
    const hydrated = await ctx.runQuery(internal.searchDocuments.hydrateHits, {
      userId,
      query: trimmed,
      scored: neighbors.map((row) => ({ id: row._id, score: row._score })),
    });
    const bestScore = hydrated.reduce(
      (best, hit) => (hit.score > best ? hit.score : best),
      -1,
    );
    const hits = hydrated
      .filter((hit) =>
        shouldKeepSearchHit({
          score: hit.score,
          matchedTerms: hit.matchedTerms,
          bestScore,
        }),
      )
      .sort((a, b) => {
        if (a.reason !== b.reason) return a.reason === "contains" ? -1 : 1;
        return b.score - a.score;
      });
    return { hits, indexing };
  },
});
