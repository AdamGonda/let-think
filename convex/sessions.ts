import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const listByProject = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, { projectId }) => {
    if (projectId === undefined) {
      const sessions = await ctx.db
        .query("sessions")
        .filter((q) => q.eq(q.field("projectId"), undefined))
        .collect();
      return sessions.sort((a, b) => b.createdAt - a.createdAt);
    }
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
    const id = await ctx.db.insert("sessions", {
      projectId,
      title: "New chat",
      createdAt: Date.now(),
    });
    return id;
  },
});

const patchTitleValidator = { id: v.id("sessions"), title: v.string() };
export const patchTitle = internalMutation({
  args: patchTitleValidator,
  handler: async (ctx, { id, title }) => {
    await ctx.db.patch(id, { title });
  },
});

export const updateTitle = action({
  args: patchTitleValidator,
  handler: async (ctx, { id, title }) => {
    await ctx.runMutation(internal.sessions.patchTitle, { id, title });
    await ctx.scheduler.runAfter(0, api.embeddings.upsert, { sessionId: id });
  },
});

export const moveToProject = mutation({
  args: {
    id: v.id("sessions"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { id, projectId }) => {
    await ctx.db.patch(id, { projectId });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, { id }) => {
    const embedding = await ctx.db
      .query("sessionEmbeddings")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .unique();
    if (embedding) await ctx.db.delete(embedding._id);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(id);
  },
});

export const getMessages = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
  },
});

export const addMessages = mutation({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    assistantContent: v.string(),
  },
  handler: async (ctx, { sessionId, userContent, assistantContent }) => {
    const now = Date.now();
    await ctx.db.insert("messages", {
      sessionId,
      role: "user",
      content: userContent,
      createdAt: now,
    });
    await ctx.db.insert("messages", {
      sessionId,
      role: "assistant",
      content: assistantContent,
      createdAt: now + 1,
    });
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
    await ctx.db.patch(sessionId, { conceptGraph });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return ctx.db.get(sessionId);
  },
});

export const getConceptGraph = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    return session?.conceptGraph ?? null;
  },
});
