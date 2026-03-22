import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const BREAK_MS = 10 * 60 * 1000;

const RESTRICT_INTERACTION_LIMIT = 3;

/** Returns the interaction limit (used when creating after break reset). */
function pickRandomLimit(): number {
  return RESTRICT_INTERACTION_LIMIT;
}

async function requireSessionOwner(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new Error("Session not found or access denied");
  }
  return { session, userId };
}

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    const row = await ctx.db
      .query("interactionSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const stored = session.interactionRestriction;
    const effectiveMode =
      stored !== undefined ? stored : row ? "restrict" : "open";

    if (effectiveMode === "open") {
      return {
        mode: "open" as const,
        limit: null as null,
        used: null as null,
        breakEndsAt: null as null,
      };
    }

    if (!row) {
      return {
        mode: "restrict" as const,
        limit: RESTRICT_INTERACTION_LIMIT,
        used: 0,
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

/** Record an interaction (increment used). Creates row with random limit if not exists. */
export const recordInteraction = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSessionOwner(ctx, sessionId);
    const existing = await ctx.db
      .query("interactionSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const now = Date.now();
    if (!existing) {
      const limit = pickRandomLimit(); // MIN_LIMIT (2) or more
      await ctx.db.insert("interactionSessions", {
        sessionId,
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

/** Start the break timer optimistically (e.g. when user sends their last allowed message). */
export const startBreakOptimistically = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSessionOwner(ctx, sessionId);
    const existing = await ctx.db
      .query("interactionSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const now = Date.now();
    if (!existing) {
      const limit = pickRandomLimit();
      await ctx.db.insert("interactionSessions", {
        sessionId,
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

/** Reset interaction session when break ends (fresh start with new limit). */
export const resetAfterBreak = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireSessionOwner(ctx, sessionId);
    const existing = await ctx.db
      .query("interactionSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const now = Date.now();
    const limit = pickRandomLimit();
    await ctx.db.insert("interactionSessions", {
      sessionId,
      userId,
      limit,
      used: 0,
      createdAt: now,
    });
  },
});
