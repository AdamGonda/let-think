import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { deleteFileCascade } from "./files";

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
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const allSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const sessionByFileId = new Map<string, (typeof allSessions)[0]>();
    for (const s of allSessions) {
      if (s.fileId) sessionByFileId.set(s.fileId, s);
    }
    const toWorkspaceFile = (file: (typeof allFiles)[0]) => ({
      ...file,
      sessionId: sessionByFileId.get(file._id)?._id ?? null,
    });
    const inboxFiles = allFiles
      .filter((f) => f.projectId === undefined)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toWorkspaceFile);
    const byProject = new Map<string, ReturnType<typeof toWorkspaceFile>[]>();
    for (const file of allFiles) {
      if (file.projectId) {
        const key = file.projectId;
        if (!byProject.has(key)) byProject.set(key, []);
        byProject.get(key)!.push(toWorkspaceFile(file));
      }
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => b.createdAt - a.createdAt);
    }
    const result: Array<{
      project: (typeof projects)[0] | null;
      files: ReturnType<typeof toWorkspaceFile>[];
    }> = [];
    result.push({ project: null, files: inboxFiles });
    for (const project of projects) {
      result.push({
        project,
        files: byProject.get(project._id) ?? [],
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
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const file of files) {
      await deleteFileCascade(ctx, file._id);
    }
    await ctx.db.delete(id);
  },
});
