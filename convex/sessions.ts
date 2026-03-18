import { v } from "convex/values";
import { mutation, internalMutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listByProject = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (projectId === undefined) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      return sessions
        .filter((s) => s.projectId === undefined)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return [];
    return ctx.db
      .query("sessions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to create a session");
    if (projectId) {
      const project = await ctx.db.get(projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or access denied");
      }
    }
    const now = Date.now();
    const id = await ctx.db.insert("sessions", {
      userId,
      projectId,
      title: "New chat",
      createdAt: now,
    });
    // Create interaction session upfront so user sees count before first message
    const limit = 5;
    await ctx.db.insert("interactionSessions", {
      sessionId: id,
      userId,
      limit,
      used: 0,
      createdAt: now,
    });
    return id;
  },
});

async function requireSessionOwner(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) throw new Error("Session not found or access denied");
  return session;
}

export const updateTitle = mutation({
  args: {
    id: v.id("sessions"),
    title: v.string(),
  },
  handler: async (ctx, { id, title }) => {
    await requireSessionOwner(ctx, id);
    await ctx.db.patch(id, { title });
  },
});

export const moveToProject = mutation({
  args: {
    id: v.id("sessions"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { id, projectId }) => {
    await requireSessionOwner(ctx, id);
    if (projectId) {
      const userId = await getAuthUserId(ctx);
      const project = await ctx.db.get(projectId);
      if (!project || project.userId !== userId) throw new Error("Project not found or access denied");
    }
    await ctx.db.patch(id, { projectId });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, { id }) => {
    await requireSessionOwner(ctx, id);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    const interactionSession = await ctx.db
      .query("interactionSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .first();
    if (interactionSession) {
      await ctx.db.delete(interactionSession._id);
    }
    await ctx.db.delete(id);
  },
});

export const getMessages = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return [];
    return ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
  },
});

/** Internal: set topic on a user message (called by generateTopicForMessage action). */
export const updateMessageTopic = internalMutation({
  args: { messageId: v.id("messages"), topic: v.string() },
  handler: async (ctx, { messageId, topic }) => {
    const msg = await ctx.db.get(messageId);
    if (msg?.role === "user") {
      await ctx.db.patch(messageId, { topic: topic.trim() });
    }
  },
});

const mentionValidator = v.optional(
  v.array(
    v.object({
      start: v.number(),
      end: v.number(),
      conceptId: v.string(),
      name: v.string(),
    })
  )
);

export const addMessages = mutation({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    assistantContent: v.string(),
    mentions: mentionValidator,
  },
  handler: async (ctx, { sessionId, userContent, assistantContent, mentions }) => {
    await requireSessionOwner(ctx, sessionId);
    const now = Date.now();
    const userMessageId = await ctx.db.insert("messages", {
      sessionId,
      role: "user",
      content: userContent,
      createdAt: now,
      ...(mentions && mentions.length > 0 ? { mentions } : {}),
    });
    await ctx.db.insert("messages", {
      sessionId,
      role: "assistant",
      content: assistantContent,
      createdAt: now + 1,
    });
    // Schedule topic generation to run when message is in DB (reactive trigger)
    if (userContent.trim()) {
      await ctx.scheduler.runAfter(0, internal.chat.generateTopicForMessage, {
        messageId: userMessageId,
        userContent,
      });
    }
    // Update title from first message if still "New chat"
    const session = await ctx.db.get(sessionId);
    if (session?.title === "New chat" && userContent.trim()) {
      const title = userContent.slice(0, 50) + (userContent.length > 50 ? "…" : "");
      await ctx.db.patch(sessionId, { title });
    }
  },
});

const conceptGraphValidator = {
  nodes: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  edges: v.array(v.object({ source: v.string(), target: v.string() })),
  batches: v.optional(
    v.array(
      v.object({
        id: v.string(),
        nodeIds: v.array(v.string()),
        promptSummary: v.optional(v.string()),
        description: v.optional(v.string()),
      })
    )
  ),
};

export const updateConceptGraph = mutation({
  args: {
    sessionId: v.id("sessions"),
    conceptGraph: v.object(conceptGraphValidator),
  },
  handler: async (ctx, { sessionId, conceptGraph }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.patch(sessionId, { conceptGraph });
  },
});

export const getConceptGraph = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    return session.conceptGraph ?? null;
  },
});

export const getDraft = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    return session.draftInput ?? "";
  },
});

export const updateDraft = mutation({
  args: {
    sessionId: v.id("sessions"),
    draftInput: v.string(),
  },
  handler: async (ctx, { sessionId, draftInput }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.patch(sessionId, { draftInput });
  },
});

export const getThinkingNotes = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    return session.thinkingNotes ?? "";
  },
});

export const updateThinkingNotes = mutation({
  args: {
    sessionId: v.id("sessions"),
    thinkingNotes: v.string(),
  },
  handler: async (ctx, { sessionId, thinkingNotes }) => {
    await requireSessionOwner(ctx, sessionId);
    await ctx.db.patch(sessionId, { thinkingNotes });
  },
});
