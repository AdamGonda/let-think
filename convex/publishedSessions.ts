import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Global whitelist of published session notes.
 * Publishing exposes only the session's `title` and `thinkingNotes`
 * to any other signed-in user — chat messages and concept graphs stay private.
 */

async function findPublishedRow(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
) {
  return ctx.db
    .query("publishedSessions")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
}

export const publish = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to publish a note");
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or access denied");
    }
    const existing = await findPublishedRow(ctx, sessionId);
    if (existing) return existing._id;
    return ctx.db.insert("publishedSessions", {
      sessionId,
      userId,
      publishedAt: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to unpublish a note");
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or access denied");
    }
    const existing = await findPublishedRow(ctx, sessionId);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const isPublished = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const row = await findPublishedRow(ctx, sessionId);
    return row != null;
  },
});

/**
 * Lists all published notes for the Discover grid.
 * Skips entries whose underlying session has been deleted.
 * Returns lightweight data only (no notes content) — callers should fetch
 * the body via `getPublishedNote` when opening the viewer.
 */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("publishedSessions")
      .withIndex("by_published")
      .order("desc")
      .collect();
    const out: Array<{
      sessionId: Id<"sessions">;
      title: string;
      publishedAt: number;
      publisherName: string;
      isMine: boolean;
    }> = [];
    for (const row of rows) {
      const session = await ctx.db.get(row.sessionId);
      if (!session) continue;
      const publisher = await ctx.db.get(row.userId);
      const publisherName =
        publisher?.name ?? publisher?.email ?? "Unknown user";
      out.push({
        sessionId: row.sessionId,
        title: session.title,
        publishedAt: row.publishedAt,
        publisherName,
        isMine: row.userId === me,
      });
    }
    return out;
  },
});

/**
 * Fetches a single published note for the read-only viewer.
 * Returns null if the session is not currently in the published whitelist
 * or if the underlying session has been deleted.
 */
export const getPublishedNote = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;
    const row = await findPublishedRow(ctx, sessionId);
    if (!row) return null;
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const publisher = await ctx.db.get(row.userId);
    const publisherName =
      publisher?.name ?? publisher?.email ?? "Unknown user";
    return {
      title: session.title,
      thinkingNotes: session.thinkingNotes ?? "",
      publishedAt: row.publishedAt,
      publisherName,
      isMine: row.userId === me,
    };
  },
});
