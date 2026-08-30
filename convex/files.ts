import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { deleteSessionOwnedRows } from "./lib/sessionOwned";
import { SESSION_TITLE_FROM_FIRST_MESSAGE_MAX_CHARS } from "./constants";

export async function requireFileOwner(ctx: MutationCtx, fileId: Id<"files">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const file = await ctx.db.get(fileId);
  if (!file || file.userId !== userId) {
    throw new Error("File not found or access denied");
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
  const title = args.title ?? "New file";
  const fileId = await ctx.db.insert("files", {
    userId: args.userId,
    projectId: args.projectId,
    title,
    createdAt: now,
    ...(args.thinkingNotes ? { thinkingNotes: args.thinkingNotes } : {}),
  });
  const sessionId = await ctx.db.insert("sessions", {
    userId: args.userId,
    projectId: args.projectId,
    fileId,
    title,
    createdAt: now,
  });
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
    if (!userId) throw new Error("Must be signed in to create a file");
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
    await ctx.db.patch(fileId, { thinkingNotes });
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
      draftInput: session?.draftInput ?? "",
      thinkingNotes: file.thinkingNotes ?? session?.thinkingNotes ?? "",
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
  if (!session || !userContent.trim()) return;
  const defaultTitle =
    session.title === "New file" || session.title === "New session";
  if (session.fileId) {
    const file = await ctx.db.get(session.fileId);
    if (file && (file.title === "New file" || file.title === "New session")) {
      await ctx.db.patch(session.fileId, {
        title: titleFromFirstMessage(userContent),
      });
    }
  } else if (defaultTitle) {
    await ctx.db.patch(sessionId, { title: titleFromFirstMessage(userContent) });
  }
}

const MIGRATE_BATCH = 25;

/**
 * Backfill files + chatSessions for the signed-in user's unmigrated sessions.
 * Idempotent: sessions that already have fileId are skipped.
 */
export const ensureMigrated = mutation({
  args: {},
  returns: v.object({ migrated: v.number(), done: v.boolean() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { migrated: 0, done: true };
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const pending = sessions.filter((s) => s.fileId === undefined);
    let migrated = 0;
    for (const session of pending.slice(0, MIGRATE_BATCH)) {
      await migrateOneSession(ctx, session._id);
      migrated += 1;
    }
    return { migrated, done: pending.length <= MIGRATE_BATCH };
  },
});

/** Admin/dev: migrate a single session by id (idempotent). */
export const migrateSessionInternal = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await migrateOneSession(ctx, sessionId);
    return null;
  },
});

async function migrateOneSession(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
) {
  const session = await ctx.db.get(sessionId);
  if (!session || !session.userId) return;
  if (session.fileId) return;

  const fileId = await ctx.db.insert("files", {
    userId: session.userId,
    projectId: session.projectId,
    title: session.title,
    createdAt: session.createdAt,
    ...(session.thinkingNotes ? { thinkingNotes: session.thinkingNotes } : {}),
  });
  await ctx.db.patch(sessionId, { fileId });

  const chatMessages = await ctx.db
    .query("chatMessages")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  if (chatMessages.length === 0) return;

  chatMessages.sort((a, b) => a.createdAt - b.createdAt);
  const firstUser = chatMessages.find(
    (m) => m.role === "user" && m.content.trim(),
  );
  const chatTitle = firstUser
    ? titleFromFirstMessage(firstUser.content)
    : "Chat";
  const chatSessionId = await ctx.db.insert("chatSessions", {
    fileId,
    userId: session.userId,
    title: chatTitle,
    createdAt: chatMessages[0]?.createdAt ?? session.createdAt,
    ...(session.chatDraftInput
      ? { draftInput: session.chatDraftInput }
      : {}),
  });
  for (const msg of chatMessages) {
    if (msg.chatSessionId) continue;
    await ctx.db.patch(msg._id, { chatSessionId });
  }
}
