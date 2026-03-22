import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const BREAK_MS = 10 * 60 * 1000;

const RESTRICT_INTERACTION_LIMIT = 3;

function pickRandomLimit(): number {
  return RESTRICT_INTERACTION_LIMIT;
}

async function getUserRow(ctx: MutationCtx, userId: Id<"users">) {
  return ctx.db
    .query("userThinkInteractions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/** Current Think interaction state for the signed-in user (no sessionId). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userThinkInteractions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!row) {
      return {
        mode: "open" as const,
        limit: null as null,
        used: null as null,
        breakEndsAt: null as null,
      };
    }
    return {
      mode: "restrict" as const,
      limit: row.limit,
      used: row.used,
      breakEndsAt: row.breakEndsAt ?? null,
    };
  },
});

/** Sync Think (restrict) vs Work (open) from client preference — one row per user. */
export const applyWorkPreferenceMode = mutation({
  args: {
    mode: v.union(v.literal("open"), v.literal("restrict")),
  },
  handler: async (ctx, { mode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await getUserRow(ctx, userId);
    if (mode === "open") {
      if (row) await ctx.db.delete(row._id);
      return;
    }
    const now = Date.now();
    if (!row) {
      await ctx.db.insert("userThinkInteractions", {
        userId,
        limit: RESTRICT_INTERACTION_LIMIT,
        used: 0,
        createdAt: now,
      });
    }
  },
});

export const recordInteraction = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const existing = await getUserRow(ctx, userId);
    const now = Date.now();
    if (!existing) {
      const limit = pickRandomLimit();
      await ctx.db.insert("userThinkInteractions", {
        userId,
        limit,
        used: 1,
        breakEndsAt: limit === 1 ? now + BREAK_MS : undefined,
        createdAt: now,
      });
      return;
    }

    const used = existing.used + 1;
    const breakEndsAt =
      used >= existing.limit && !existing.breakEndsAt
        ? now + BREAK_MS
        : existing.breakEndsAt;
    await ctx.db.patch(existing._id, { used, breakEndsAt });
  },
});

export const startBreakOptimistically = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const existing = await getUserRow(ctx, userId);
    const now = Date.now();
    if (!existing) {
      const limit = pickRandomLimit();
      await ctx.db.insert("userThinkInteractions", {
        userId,
        limit,
        used: 0,
        createdAt: now,
      });
      return;
    }

    if (existing.used >= existing.limit - 1 && !existing.breakEndsAt) {
      await ctx.db.patch(existing._id, {
        breakEndsAt: now + BREAK_MS,
      });
    }
  },
});

export const resetAfterBreak = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const existing = await getUserRow(ctx, userId);
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const now = Date.now();
    const limit = pickRandomLimit();
    await ctx.db.insert("userThinkInteractions", {
      userId,
      limit,
      used: 0,
      createdAt: now,
    });
  },
});

/** One-off: remove legacy per-session rows after migrating to userThinkInteractions. */
export const deleteLegacyInteractionSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("interactionSessions").collect();
    for (const r of rows) {
      await ctx.db.delete(r._id);
    }
  },
});
