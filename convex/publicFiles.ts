import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireAuthenticatedUser(
  ctx: MutationCtx | QueryCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  return userId;
}

async function loadOwnedSession(
  ctx: MutationCtx | QueryCtx,
  sessionId: Id<"sessions">,
  userId: Id<"users">,
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new Error("Session not found or access denied");
  }
  return session;
}

export const publish = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.id("public_files"),
  handler: async (ctx, { sessionId }) => {
    const userId = await requireAuthenticatedUser(ctx);
    const session = await loadOwnedSession(ctx, sessionId, userId);
    const now = Date.now();
    const existing = await ctx.db
      .query("public_files")
      .withIndex("by_owner_session", (q) =>
        q.eq("ownerUserId", userId).eq("sessionId", sessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        publishedAt: now,
        titleSnapshot: session.title,
        thinkingNotesSnapshot: session.thinkingNotes,
        draftInputSnapshot: session.draftInput,
      });
      return existing._id;
    }

    return await ctx.db.insert("public_files", {
      sessionId,
      ownerUserId: userId,
      publishedAt: now,
      titleSnapshot: session.title,
      thinkingNotesSnapshot: session.thinkingNotes,
      draftInputSnapshot: session.draftInput,
    });
  },
});

export const unpublish = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const userId = await requireAuthenticatedUser(ctx);
    await loadOwnedSession(ctx, sessionId, userId);
    const existing = await ctx.db
      .query("public_files")
      .withIndex("by_owner_session", (q) =>
        q.eq("ownerUserId", userId).eq("sessionId", sessionId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("public_files"),
      _creationTime: v.number(),
      sessionId: v.id("sessions"),
      ownerUserId: v.id("users"),
      publishedAt: v.number(),
      titleSnapshot: v.optional(v.string()),
      thinkingNotesSnapshot: v.optional(v.string()),
      draftInputSnapshot: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    const userId = await requireAuthenticatedUser(ctx);
    await loadOwnedSession(ctx, sessionId, userId);
    return await ctx.db
      .query("public_files")
      .withIndex("by_owner_session", (q) =>
        q.eq("ownerUserId", userId).eq("sessionId", sessionId),
      )
      .first();
  },
});

export const listPublic = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("public_files"),
      _creationTime: v.number(),
      sessionId: v.id("sessions"),
      ownerUserId: v.id("users"),
      publishedAt: v.number(),
      titleSnapshot: v.optional(v.string()),
      thinkingNotesSnapshot: v.optional(v.string()),
      draftInputSnapshot: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("public_files").withIndex("by_published").order("desc").collect();
  },
});
