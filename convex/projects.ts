import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("projects")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.db.insert("projects", {
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
    await ctx.db.patch(id, { name });
  },
});

export const listWithSessions = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_created")
      .order("desc")
      .collect();
    const allSessions = await ctx.db.query("sessions").collect();
    const inboxSessions = allSessions
      .filter((s) => s.projectId === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
    const byProject = new Map<
      string,
      Array<(typeof allSessions)[0]>
    >();
    for (const s of allSessions) {
      if (s.projectId) {
        const key = s.projectId;
        if (!byProject.has(key)) byProject.set(key, []);
        byProject.get(key)!.push(s);
      }
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => b.createdAt - a.createdAt);
    }
    const result: Array<{
      project: (typeof projects)[0] | null;
      sessions: (typeof allSessions)[0][];
    }> = [];
    result.push({ project: null, sessions: inboxSessions });
    for (const project of projects) {
      result.push({
        project,
        sessions: byProject.get(project._id) ?? [],
      });
    }
    return result;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
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
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(id);
  },
});
