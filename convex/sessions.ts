import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { maybeTitleFileFromFirstGraphMessage } from "./files";
import {
  canvasFrameValue,
  canvasStrokeValue,
  canvasViewportValue,
} from "./schema";
import { imageUrlsForIds } from "./fileStorage";
import {
  loadFileNotes,
  loadSessionDraft,
  skipEmptyOverwrite,
  upsertSessionDraft,
} from "./lib/editorSidecars";
import { IMAGE_PROMPT_MAX } from "./constants";

async function requireSessionOwner(ctx: MutationCtx, sessionId: Id<"sessions">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Must be signed in");
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) throw new Error("Session not found or access denied");
  return session;
}

export const listMessagesPaginated = query({
  args: {
    sessionId: v.id("sessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { sessionId, paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }
    const result = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
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

const imageStorageIdsValidator = v.optional(v.array(v.id("_storage")));

export const addMessages = mutation({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    assistantContent: v.string(),
    mentions: mentionValidator,
    imageStorageIds: imageStorageIdsValidator,
  },
  handler: async (
    ctx,
    { sessionId, userContent, assistantContent, mentions, imageStorageIds }
  ): Promise<void> => {
    await requireSessionOwner(ctx, sessionId);
    const now = Date.now();
    const storedImageIds = imageStorageIds?.slice(0, IMAGE_PROMPT_MAX);
    const userMessageId = await ctx.db.insert("messages", {
      sessionId,
      role: "user",
      content: userContent,
      createdAt: now,
      ...(mentions && mentions.length > 0 ? { mentions } : {}),
      ...(storedImageIds && storedImageIds.length > 0
        ? { imageStorageIds: storedImageIds }
        : {}),
    });
    await ctx.db.insert("messages", {
      sessionId,
      role: "assistant",
      content: assistantContent,
      createdAt: now + 1,
    });
    if (userContent.trim()) {
      await ctx.scheduler.runAfter(0, internal.chat.generateTopicForMessage, {
        messageId: userMessageId,
        userContent,
      });
    }
    await maybeTitleFileFromFirstGraphMessage(ctx, sessionId, userContent);
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
    const existing = await ctx.db
      .query("sessionConceptGraphs")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { graph: conceptGraph });
    } else {
      await ctx.db.insert("sessionConceptGraphs", {
        sessionId,
        graph: conceptGraph,
      });
    }
  },
});

async function loadConceptGraphForSession(
  ctx: QueryCtx,
  sessionId: Id<"sessions">,
  userId: Id<"users">
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) return null;
  const row = await ctx.db
    .query("sessionConceptGraphs")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  return row?.graph ?? null;
}

export const getConceptGraph = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return loadConceptGraphForSession(ctx, sessionId, userId);
  },
});

const canvasDocument = v.object({
  strokes: v.array(canvasStrokeValue),
  viewport: canvasViewportValue,
  frames: v.array(canvasFrameValue),
});

export const getCanvas = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(canvasDocument, v.null()),
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    const row = await ctx.db
      .query("sessionCanvases")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (!row) return null;
    return {
      strokes: row.strokes,
      viewport: row.viewport,
      frames: row.frames ?? [],
    };
  },
});

export const updateCanvas = mutation({
  args: {
    sessionId: v.id("sessions"),
    strokes: v.array(canvasStrokeValue),
    viewport: canvasViewportValue,
    frames: v.optional(v.array(canvasFrameValue)),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, strokes, viewport, frames }) => {
    await requireSessionOwner(ctx, sessionId);
    const existing = await ctx.db
      .query("sessionCanvases")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    const nextFrames = frames ?? [];
    if (existing) {
      await ctx.db.patch(existing._id, {
        strokes,
        viewport,
        frames: nextFrames,
      });
    } else {
      await ctx.db.insert("sessionCanvases", {
        sessionId,
        strokes,
        viewport,
        frames: nextFrames,
      });
    }
    return null;
  },
});

/** Viewport-only persist — avoids rewriting the full strokes array on pan/zoom. */
export const updateCanvasViewport = mutation({
  args: {
    sessionId: v.id("sessions"),
    viewport: canvasViewportValue,
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, viewport }) => {
    await requireSessionOwner(ctx, sessionId);
    const existing = await ctx.db
      .query("sessionCanvases")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { viewport });
    } else {
      await ctx.db.insert("sessionCanvases", {
        sessionId,
        strokes: [],
        viewport,
      });
    }
    return null;
  },
});

/**
 * Loads graph + full message history for chat.send after verifying session ownership.
 * Actions should call with userId from getAuthUserId(ctx).
 */
export const internalLoadSessionForChatSend = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    includeWriting: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { sessionId, userId, includeWriting }
  ): Promise<{
    existingGraph: {
      nodes: Array<{ id: string; name: string; description?: string }>;
      edges: Array<{ source: string; target: string }>;
      batches?: Array<{
        id: string;
        nodeIds: string[];
        promptSummary?: string;
        description?: string;
      }>;
    } | null;
    thinkingNotes: string | null;
    messages: Array<{
      _id: Id<"messages">;
      _creationTime: number;
      sessionId: Id<"sessions">;
      role: "user" | "assistant" | "system";
      content: string;
      createdAt: number;
      topic?: string;
      mentions?: Array<{
        start: number;
        end: number;
        conceptId: string;
        name: string;
      }>;
      imageStorageIds?: Array<Id<"_storage">>;
    }>;
  } | null> => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    const row = await ctx.db
      .query("sessionConceptGraphs")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    const existingGraph = row?.graph ?? null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
    let thinkingNotes: string | null = null;
    if (includeWriting) {
      if (session.fileId) {
        const file = await ctx.db.get(session.fileId);
        thinkingNotes = await loadFileNotes(
          ctx,
          session.fileId,
          file?.thinkingNotes,
          session.thinkingNotes,
        );
      } else {
        thinkingNotes = session.thinkingNotes ?? "";
      }
    }
    return { existingGraph, thinkingNotes, messages };
  },
});

export const internalCanAccessSession = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, { sessionId, userId }) => {
    const session = await ctx.db.get(sessionId);
    return !!session && session.userId === userId;
  },
});

export const updateDraft = mutation({
  args: {
    sessionId: v.id("sessions"),
    draftInput: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, draftInput }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;
    const existing = await loadSessionDraft(ctx, sessionId, session.draftInput);
    if (skipEmptyOverwrite(draftInput, existing)) return null;
    await upsertSessionDraft(ctx, sessionId, draftInput);
    return null;
  },
});
