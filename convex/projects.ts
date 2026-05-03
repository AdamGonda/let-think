import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to create a project");
    const id = await ctx.db.insert("projects", {
      userId,
      name: "New project",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const updateName = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, { id, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const project = await ctx.db.get(id);
    if (!project || project.userId !== userId) throw new Error("Project not found or access denied");
    await ctx.db.patch(id, { name });
  },
});

export const listWithSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const publishedRows = await ctx.db
      .query("publishedSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const publishedSessionIds = new Set(
      publishedRows.map((row) => row.sessionId),
    );
    const attachPublished = <T extends (typeof allSessions)[0]>(s: T) => ({
      ...s,
      isPublished: publishedSessionIds.has(s._id),
    });
    const inboxSessions = allSessions
      .filter((s) => s.projectId === undefined)
      .map(attachPublished)
      .sort((a, b) => b.createdAt - a.createdAt);
    type SessionWithPublished = (typeof allSessions)[0] & { isPublished: boolean };
    const byProject = new Map<string, SessionWithPublished[]>();
    for (const s of allSessions) {
      if (s.projectId) {
        const key = s.projectId;
        if (!byProject.has(key)) byProject.set(key, []);
        byProject.get(key)!.push(attachPublished(s));
      }
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => b.createdAt - a.createdAt);
    }
    const result: Array<{
      project: (typeof projects)[0] | null;
      sessions: SessionWithPublished[];
    }> = [];
    result.push({ project: null, sessions: inboxSessions });
    for (const project of projects) {
      result.push({
        project,
        sessions: (byProject.get(project._id) ?? []) as SessionWithPublished[],
      });
    }
    return result;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    const project = await ctx.db.get(id);
    if (!project || project.userId !== userId) throw new Error("Project not found or access denied");
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const session of sessions) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      const graphRow = await ctx.db
        .query("sessionConceptGraphs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();
      if (graphRow) {
        await ctx.db.delete(graphRow._id);
      }
      const publishedRow = await ctx.db
        .query("publishedSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();
      if (publishedRow) {
        await ctx.db.delete(publishedRow._id);
      }
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(id);
  },
});
