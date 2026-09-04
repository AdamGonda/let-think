import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { deleteSessionOwnedRows } from "./lib/sessionOwned";
import {
  deleteFileNotes,
  loadFileNotes,
  loadSessionDraft,
  upsertFileNotes,
} from "./lib/editorSidecars";
import { SESSION_TITLE_FROM_FIRST_MESSAGE_MAX_CHARS } from "./constants";

export async function requireFileOwner(ctx: MutationCtx, fileId: Id<"files">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const file = await ctx.db.get(fileId);
  if (!file || file.userId !== userId) {
    throw new Error("Idea not found or access denied");
  }
  return { userId, file };
}

export async function ideationSessionForFile(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .first();
}

export async function createFileWithSession(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    title?: string;
    createdAt?: number;
    thinkingNotes?: string;
  },
): Promise<{ fileId: Id<"files">; sessionId: Id<"sessions"> }> {
  const now = args.createdAt ?? Date.now();
  const title = args.title ?? "New idea";
  const fileId = await ctx.db.insert("files", {
    userId: args.userId,
    projectId: args.projectId,
    title,
    createdAt: now,
  });
  const sessionId = await ctx.db.insert("sessions", {
    userId: args.userId,
    projectId: args.projectId,
    fileId,
    title,
    createdAt: now,
  });
  if (args.thinkingNotes) {
    await upsertFileNotes(ctx, fileId, args.thinkingNotes);
  }
  return { fileId, sessionId };
}

export const create = mutation({
  args: { projectId: v.optional(v.id("projects")) },
  returns: v.object({
    fileId: v.id("files"),
    sessionId: v.id("sessions"),
  }),
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to create an idea");
    if (projectId) {
      const project = await ctx.db.get(projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or access denied");
      }
    }
    return await createFileWithSession(ctx, { userId, projectId });
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("files"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, title }) => {
    await requireFileOwner(ctx, id);
    await ctx.db.patch(id, { title });
    return null;
  },
});

export const moveToProject = mutation({
  args: {
    id: v.id("files"),
    projectId: v.optional(v.id("projects")),
  },
  returns: v.null(),
  handler: async (ctx, { id, projectId }) => {
    const { userId } = await requireFileOwner(ctx, id);
    if (projectId) {
      const project = await ctx.db.get(projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or access denied");
      }
    }
    await ctx.db.patch(id, { projectId });
    return null;
  },
});

export const updateThinkingNotes = mutation({
  args: {
    fileId: v.id("files"),
    thinkingNotes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { fileId, thinkingNotes }) => {
    await requireFileOwner(ctx, fileId);
    await upsertFileNotes(ctx, fileId, thinkingNotes);
    return null;
  },
});

export const getEditorFields = query({
  args: { fileId: v.id("files") },
  returns: v.union(
    v.object({
      draftInput: v.string(),
      thinkingNotes: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { fileId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
    return {
      draftInput: session
        ? await loadSessionDraft(ctx, session._id, session.draftInput)
        : "",
      thinkingNotes: await loadFileNotes(
        ctx,
        fileId,
        file.thinkingNotes,
        session?.thinkingNotes,
      ),
    };
  },
});

async function deleteChatSessionRows(
  ctx: MutationCtx,
  chatSessionId: Id<"chatSessions">,
) {
  const msgs = await ctx.db
    .query("chatMessages")
    .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
    .collect();
  for (const msg of msgs) {
    await ctx.db.delete(msg._id);
  }
  await ctx.db.delete(chatSessionId);
}

export async function deleteFileCascade(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  const chatSessions = await ctx.db
    .query("chatSessions")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .collect();
  for (const chat of chatSessions) {
    await deleteChatSessionRows(ctx, chat._id);
  }
  const session = await ideationSessionForFile(ctx, fileId);
  if (session) {
    await deleteSessionOwnedRows(ctx, session._id);
    await ctx.db.delete(session._id);
  }
  await deleteFileNotes(ctx, fileId);
  await ctx.db.delete(fileId);
}

export const remove = mutation({
  args: { id: v.id("files") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireFileOwner(ctx, id);
    await deleteFileCascade(ctx, id);
    return null;
  },
});

export function titleFromFirstMessage(userContent: string): string {
  return (
    userContent.slice(0, SESSION_TITLE_FROM_FIRST_MESSAGE_MAX_CHARS) +
    (userContent.length > SESSION_TITLE_FROM_FIRST_MESSAGE_MAX_CHARS ? "…" : "")
  );
}

export async function maybeTitleFileFromFirstGraphMessage(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  userContent: string,
) {
  const session = await ctx.db.get(sessionId);
  if (!session?.fileId || !userContent.trim()) return;
  const file = await ctx.db.get(session.fileId);
  if (
    file &&
    (file.title === "New idea" ||
      file.title === "New file" ||
      file.title === "New session")
  ) {
    const title = titleFromFirstMessage(userContent);
    await ctx.db.patch(session.fileId, { title });
  }
}
