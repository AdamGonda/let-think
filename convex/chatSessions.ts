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
import { imageUrlsForIds } from "./fileStorage";
import { IMAGE_PROMPT_MAX } from "./constants";
import { loadFileNotes } from "./lib/editorSidecars";

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
    const result = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
      .order("desc")
      .paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (m) => ({
        ...m,
        imageUrls: await imageUrlsForIds(ctx, m.imageStorageIds),
      })),
    );
    return { ...result, page };
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

const imageStorageIdsValidator = v.optional(v.array(v.id("_storage")));

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
    userContent: string;
    assistantContent: string;
    mentions?: Array<{
      start: number;
      end: number;
      conceptId: string;
      name: string;
    }>;
    imageStorageIds?: Array<Id<"_storage">>;
  },
): Promise<{
  userMessageId: Id<"chatMessages">;
  assistantMessageId: Id<"chatMessages">;
}> {
  const now = Date.now();
  const storedImageIds = args.imageStorageIds?.slice(0, IMAGE_PROMPT_MAX);
  const userMessageId = await ctx.db.insert("chatMessages", {
    chatSessionId: args.chatSessionId,
    role: "user",
    content: args.userContent,
    createdAt: now,
    ...(args.mentions && args.mentions.length > 0
      ? { mentions: args.mentions }
      : {}),
    ...(storedImageIds && storedImageIds.length > 0
      ? { imageStorageIds: storedImageIds }
      : {}),
  });
  const assistantMessageId = await ctx.db.insert("chatMessages", {
    chatSessionId: args.chatSessionId,
    role: "assistant",
    content: args.assistantContent,
    createdAt: now + 1,
  });
  await maybeTitleChatSession(ctx, args.chatSessionId, args.userContent);
  return { userMessageId, assistantMessageId };
}

export const startChatTurn = internalMutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    userId: v.id("users"),
    userContent: v.string(),
    mentions: mentionValidator,
    imageStorageIds: imageStorageIdsValidator,
  },
  returns: v.object({ assistantMessageId: v.id("chatMessages") }),
  handler: async (
    ctx,
    { chatSessionId, userId, userContent, mentions, imageStorageIds },
  ) => {
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) {
      throw new Error("Chat session not found or access denied");
    }
    const { assistantMessageId } = await insertChatTurn(ctx, {
      chatSessionId,
      userContent,
      assistantContent: "",
      mentions,
      imageStorageIds,
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
    if (!msg.chatSessionId) {
      throw new Error("Chat message has no chat session");
    }
    const chatSession = await ctx.db.get(msg.chatSessionId);
    if (!chatSession || chatSession.userId !== userId) {
      throw new Error("Chat session not found or access denied");
    }
    await ctx.db.patch(messageId, { content });
    return null;
  },
});

export const internalLoadForSend = internalQuery({
  args: {
    chatSessionId: v.id("chatSessions"),
    userId: v.id("users"),
    includeWriting: v.optional(v.boolean()),
    includeGraph: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { chatSessionId, userId, includeWriting, includeGraph },
  ): Promise<{
    messages: Array<{
      role: "user" | "assistant";
      content: string;
      imageStorageIds?: Array<Id<"_storage">>;
    }>;
    thinkingNotes: string | null;
    conceptGraph: {
      nodes: Array<{ id: string; name: string; description?: string }>;
      edges: Array<{ source: string; target: string }>;
      batches?: Array<{
        id: string;
        nodeIds: string[];
        promptSummary?: string;
        description?: string;
      }>;
    } | null;
  } | null> => {
    const chatSession = await ctx.db.get(chatSessionId);
    if (!chatSession || chatSession.userId !== userId) return null;
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
      .order("asc")
      .collect();
    let thinkingNotes: string | null = null;
    if (includeWriting) {
      const file = await ctx.db.get(chatSession.fileId);
      thinkingNotes = await loadFileNotes(
        ctx,
        chatSession.fileId,
        file?.thinkingNotes,
      );
    }
    let conceptGraph: {
      nodes: Array<{ id: string; name: string; description?: string }>;
      edges: Array<{ source: string; target: string }>;
      batches?: Array<{
        id: string;
        nodeIds: string[];
        promptSummary?: string;
        description?: string;
      }>;
    } | null = null;
    if (includeGraph) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_file", (q) => q.eq("fileId", chatSession.fileId))
        .first();
      if (session) {
        const row = await ctx.db
          .query("sessionConceptGraphs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .first();
        conceptGraph = row?.graph ?? null;
      }
    }
    return {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.imageStorageIds && m.imageStorageIds.length > 0
          ? { imageStorageIds: m.imageStorageIds }
          : {}),
      })),
      thinkingNotes,
      conceptGraph,
    };
  },
});
