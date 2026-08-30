import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireFileOwner, titleFromFirstMessage } from "./files";

async function requireChatSessionOwner(
  ctx: MutationCtx,
  chatSessionId: Id<"chatSessions">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const chatSession = await ctx.db.get(chatSessionId);
  if (!chatSession || chatSession.userId !== userId) {
    throw new Error("Chat session not found or access denied");
  }
  return { userId, chatSession };
}

export const listByFile = query({
  args: { fileId: v.id("files") },
  returns: v.array(
    v.object({
      _id: v.id("chatSessions"),
      _creationTime: v.number(),
      fileId: v.id("files"),
      userId: v.id("users"),
      title: v.string(),
      createdAt: v.number(),
      draftInput: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { fileId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) return [];
    const rows = await ctx.db
      .query("chatSessions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .order("desc")
      .collect();
    return rows;
  },
});

export const create = mutation({
  args: { fileId: v.id("files") },
  returns: v.id("chatSessions"),
  handler: async (ctx, { fileId }) => {
    const { userId } = await requireFileOwner(ctx, fileId);
    return await ctx.db.insert("chatSessions", {
      fileId,
      userId,
      title: "New chat",
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("chatSessions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireChatSessionOwner(ctx, id);
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_session", (q) => q.eq("chatSessionId", id))
      .collect();
    for (const msg of msgs) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(id);
    return null;
  },
});

export const updateDraft = mutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    draftInput: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { chatSessionId, draftInput }) => {
    await requireChatSessionOwner(ctx, chatSessionId);
    await ctx.db.patch(chatSessionId, { draftInput });
    return null;
  },
});

export const getDraft = query({
  args: { chatSessionId: v.id("chatSessions") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { chatSessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) return null;
    return chatSession.draftInput ?? "";
  },
});

const emptyMessagePage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

export const listMessagesPaginated = query({
  args: {
    chatSessionId: v.id("chatSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { chatSessionId, paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return emptyMessagePage;
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) return emptyMessagePage;
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

const mentionValidator = v.optional(
  v.array(
    v.object({
      start: v.number(),
      end: v.number(),
      conceptId: v.string(),
      name: v.string(),
    }),
  ),
);

async function maybeTitleChatSession(
  ctx: MutationCtx,
  chatSessionId: Id<"chatSessions">,
  userContent: string,
) {
  const chatSession = await ctx.db.get(chatSessionId);
  if (
    chatSession &&
    (chatSession.title === "New chat" || chatSession.title === "Chat") &&
    userContent.trim()
  ) {
    await ctx.db.patch(chatSessionId, {
      title: titleFromFirstMessage(userContent),
    });
  }
}

async function insertChatTurn(
  ctx: MutationCtx,
  args: {
    chatSessionId: Id<"chatSessions">;
    sessionId?: Id<"sessions">;
    userContent: string;
    assistantContent: string;
    mentions?: Array<{
      start: number;
      end: number;
      conceptId: string;
      name: string;
    }>;
  },
): Promise<Id<"chatMessages">> {
  const now = Date.now();
  await ctx.db.insert("chatMessages", {
    chatSessionId: args.chatSessionId,
    ...(args.sessionId ? { sessionId: args.sessionId } : {}),
    role: "user",
    content: args.userContent,
    createdAt: now,
    ...(args.mentions && args.mentions.length > 0
      ? { mentions: args.mentions }
      : {}),
  });
  const assistantMessageId = await ctx.db.insert("chatMessages", {
    chatSessionId: args.chatSessionId,
    ...(args.sessionId ? { sessionId: args.sessionId } : {}),
    role: "assistant",
    content: args.assistantContent,
    createdAt: now + 1,
  });
  await maybeTitleChatSession(ctx, args.chatSessionId, args.userContent);
  return assistantMessageId;
}

export const startChatTurn = internalMutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    userId: v.id("users"),
    userContent: v.string(),
    mentions: mentionValidator,
  },
  returns: v.object({ assistantMessageId: v.id("chatMessages") }),
  handler: async (ctx, { chatSessionId, userId, userContent, mentions }) => {
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) {
      throw new Error("Chat session not found or access denied");
    }
    const ideation = await ctx.db
      .query("sessions")
      .withIndex("by_file", (q) => q.eq("fileId", chatSession.fileId))
      .first();
    const assistantMessageId = await insertChatTurn(ctx, {
      chatSessionId,
      sessionId: ideation?._id,
      userContent,
      assistantContent: "",
      mentions,
    });
    return { assistantMessageId };
  },
});

export const patchChatMessage = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    userId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, userId, content }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg || msg.role !== "assistant") {
      throw new Error("Assistant message not found");
    }
    if (msg.chatSessionId) {
      const chatSession = await ctx.db.get(msg.chatSessionId);
      if (!chatSession || chatSession.userId !== userId) {
        throw new Error("Chat session not found or access denied");
      }
    } else if (msg.sessionId) {
      const session = await ctx.db.get(msg.sessionId);
      if (!session || session.userId !== userId) {
        throw new Error("Session not found or access denied");
      }
    } else {
      throw new Error("Chat message has no session");
    }
    await ctx.db.patch(messageId, { content });
    return null;
  },
});

export const internalLoadForSend = internalQuery({
  args: {
    chatSessionId: v.id("chatSessions"),
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    { chatSessionId, userId },
  ): Promise<{
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  } | null> => {
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) return null;
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
      .order("asc")
      .collect();
    return {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  },
});
