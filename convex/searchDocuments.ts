import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  batchIdForNode,
  batchIndexForId,
  chatSourceKey,
  clipEmbeddingText,
  explainSearchHit,
  hashContent,
  hasReadyEmbedding,
  ideaEmbeddingText,
  ideaSourceKey,
  isScheduledNoteEmbedCurrent,
  makeSnippet,
  noteSourceKey,
  removedIdeaNodeIds,
  shouldEnqueueEmbed,
  type ConceptGraphSlice,
  type SearchKind,
} from "./lib/searchDocumentsCore";

export {
  SEARCH_EMBEDDING_DIMENSIONS,
  SEARCH_EMBED_TEXT_MAX,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MIN_SEMANTIC_SCORE,
  SEARCH_SEMANTIC_SCORE_GAP,
  SEARCH_SNIPPET_MAX,
  batchIdForNode,
  batchIndexForId,
  chatSourceKey,
  clipEmbeddingText,
  explainSearchHit,
  hashContent,
  hasReadyEmbedding,
  ideaEmbeddingText,
  ideaSourceKey,
  isScheduledNoteEmbedCurrent,
  makeSnippet,
  matchingTerms,
  noteEmbeddingHash,
  noteSourceKey,
  queryTerms,
  removedIdeaNodeIds,
  searchHitReasonLabel,
  shouldEnqueueEmbed,
  shouldKeepSearchHit,
  snippetAroundMatch,
} from "./lib/searchDocumentsCore";
export type { ConceptGraphSlice, SearchKind } from "./lib/searchDocumentsCore";

type UpsertArgs = {
  userId: Id<"users">;
  kind: SearchKind;
  sourceKey: string;
  fileId: Id<"files">;
  sessionId?: Id<"sessions">;
  chatSessionId?: Id<"chatSessions">;
  chatMessageId?: Id<"chatMessages">;
  nodeId?: string;
  batchId?: string;
  title: string;
  embeddingText: string;
  retryPending?: boolean;
};

function fieldsWithoutEmbedding(args: UpsertArgs, now: number, createdAt: number) {
  const embeddingText = clipEmbeddingText(args.embeddingText);
  return {
    userId: args.userId,
    kind: args.kind,
    sourceKey: args.sourceKey,
    fileId: args.fileId,
    ...(args.sessionId ? { sessionId: args.sessionId } : {}),
    ...(args.chatSessionId ? { chatSessionId: args.chatSessionId } : {}),
    ...(args.chatMessageId ? { chatMessageId: args.chatMessageId } : {}),
    ...(args.nodeId ? { nodeId: args.nodeId } : {}),
    ...(args.batchId ? { batchId: args.batchId } : {}),
    title: args.title,
    snippet: makeSnippet(embeddingText),
    embeddingText,
    contentHash: hashContent(embeddingText),
    createdAt,
    updatedAt: now,
  };
}

async function findBySource(
  ctx: MutationCtx,
  userId: Id<"users">,
  sourceKey: string,
) {
  return await ctx.db
    .query("searchDocuments")
    .withIndex("by_user_source", (q) =>
      q.eq("userId", userId).eq("sourceKey", sourceKey),
    )
    .first();
}

/** @returns id when a (re)embed should run; null if deleted or skipped. */
export async function upsertSearchDocument(
  ctx: MutationCtx,
  args: UpsertArgs,
): Promise<Id<"searchDocuments"> | null> {
  const existing = await findBySource(ctx, args.userId, args.sourceKey);
  const trimmed = args.embeddingText.trim();
  if (!trimmed) {
    if (existing) await ctx.db.delete(existing._id);
    return null;
  }
  const now = Date.now();
  const next = fieldsWithoutEmbedding(args, now, existing?.createdAt ?? now);
  if (
    !shouldEnqueueEmbed(
      existing,
      next.contentHash,
      args.retryPending === true,
    )
  ) {
    if (existing && existing.title !== next.title) {
      await ctx.db.patch(existing._id, { title: next.title, updatedAt: now });
    }
    return null;
  }
  if (!existing) {
    return await ctx.db.insert("searchDocuments", next);
  }
  await ctx.db.replace(existing._id, next);
  return existing._id;
}

export async function scheduleEmbed(
  ctx: MutationCtx,
  ids: Id<"searchDocuments">[],
): Promise<void> {
  if (ids.length === 0) return;
  await ctx.scheduler.runAfter(
    0,
    internal.searchDocumentsActions.processSearchDocuments,
    { ids },
  );
}

export async function deleteSearchDocumentsByFile(
  ctx: MutationCtx,
  fileId: Id<"files">,
): Promise<void> {
  const rows = await ctx.db
    .query("searchDocuments")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

export async function deleteSearchDocumentsByChatSession(
  ctx: MutationCtx,
  chatSessionId: Id<"chatSessions">,
): Promise<void> {
  const rows = await ctx.db
    .query("searchDocuments")
    .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chatSessionId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

export async function deleteSearchDocumentsBySession(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
): Promise<void> {
  const rows = await ctx.db
    .query("searchDocuments")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

export async function patchSearchDocumentTitlesForFile(
  ctx: MutationCtx,
  fileId: Id<"files">,
  title: string,
): Promise<void> {
  const rows = await ctx.db
    .query("searchDocuments")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .collect();
  const now = Date.now();
  for (const row of rows) {
    if (row.title !== title) {
      await ctx.db.patch(row._id, { title, updatedAt: now });
    }
  }
}

async function ideationSessionForFile(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .first();
}

export async function enqueueNoteSearch(
  ctx: MutationCtx,
  fileId: Id<"files">,
  retryPending = false,
): Promise<void> {
  const file = await ctx.db.get(fileId);
  if (!file?.userId) return;
  const session = await ideationSessionForFile(ctx, fileId);
  const id = await upsertSearchDocument(ctx, {
    userId: file.userId,
    kind: "note",
    sourceKey: noteSourceKey(fileId),
    fileId,
    sessionId: session?._id,
    title: file.title,
    embeddingText: file.thinkingNotes ?? "",
    retryPending,
  });
  if (id) await scheduleEmbed(ctx, [id]);
}

export const enqueueNoteSearchIfCurrent = internalMutation({
  args: {
    fileId: v.id("files"),
    contentHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { fileId, contentHash }) => {
    const file = await ctx.db.get(fileId);
    if (!file) return null;
    if (!isScheduledNoteEmbedCurrent(file.thinkingNotes ?? "", contentHash)) {
      return null;
    }
    await enqueueNoteSearch(ctx, fileId);
    return null;
  },
});

export async function enqueueChatMessageSearch(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    messageId: Id<"chatMessages">;
    retryPending?: boolean;
  },
): Promise<void> {
  const msg = await ctx.db.get(args.messageId);
  if (!msg?.chatSessionId) return;
  const chatSession = await ctx.db.get(msg.chatSessionId);
  if (!chatSession || chatSession.userId !== args.userId) return;
  const file = await ctx.db.get(chatSession.fileId);
  if (!file) return;
  const session = await ideationSessionForFile(ctx, file._id);
  const id = await upsertSearchDocument(ctx, {
    userId: args.userId,
    kind: "chat",
    sourceKey: chatSourceKey(args.messageId),
    fileId: file._id,
    sessionId: session?._id,
    chatSessionId: chatSession._id,
    chatMessageId: args.messageId,
    title: file.title,
    embeddingText: msg.content,
    retryPending: args.retryPending,
  });
  if (id) await scheduleEmbed(ctx, [id]);
}

export async function syncIdeasForSession(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  retryPending = false,
): Promise<void> {
  const session = await ctx.db.get(sessionId);
  if (!session?.userId || !session.fileId) return;
  const file = await ctx.db.get(session.fileId);
  if (!file) return;
  const graphRow = await ctx.db
    .query("sessionConceptGraphs")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  const graph: ConceptGraphSlice = graphRow?.graph ?? { nodes: [] };
  const existing = await ctx.db
    .query("searchDocuments")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  const ideaRows = existing.filter((row) => row.kind === "idea");
  const currentIds = new Set(graph.nodes.map((node) => node.id));
  const embedIds: Id<"searchDocuments">[] = [];

  for (const node of graph.nodes) {
    const id = await upsertSearchDocument(ctx, {
      userId: session.userId,
      kind: "idea",
      sourceKey: ideaSourceKey(sessionId, node.id),
      fileId: session.fileId,
      sessionId,
      nodeId: node.id,
      batchId: batchIdForNode(graph, node.id),
      title: file.title,
      embeddingText: ideaEmbeddingText(node),
      retryPending,
    });
    if (id) embedIds.push(id);
  }

  const stale = removedIdeaNodeIds(
    ideaRows.map((row) => row.nodeId).filter((id): id is string => id != null),
    currentIds,
  );
  const staleSet = new Set(stale);
  for (const row of ideaRows) {
    if (row.nodeId && staleSet.has(row.nodeId)) {
      await ctx.db.delete(row._id);
    }
  }

  await scheduleEmbed(ctx, embedIds);
}

export const hasAnyForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("searchDocuments")
      .withIndex("by_user_source", (q) => q.eq("userId", userId))
      .first();
    return row != null;
  },
});

export const getByIds = internalQuery({
  args: { ids: v.array(v.id("searchDocuments")) },
  handler: async (ctx, { ids }) => {
    const rows = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return rows.filter((row): row is Doc<"searchDocuments"> => row != null);
  },
});

export const patchEmbedding = internalMutation({
  args: {
    id: v.id("searchDocuments"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, { id, embedding }) => {
    const row = await ctx.db.get(id);
    if (!row) return null;
    await ctx.db.patch(id, { embedding, updatedAt: Date.now() });
    return null;
  },
});

const searchHitValidator = v.object({
  kind: v.union(v.literal("note"), v.literal("chat"), v.literal("idea")),
  title: v.string(),
  snippet: v.string(),
  fileId: v.id("files"),
  sessionId: v.union(v.id("sessions"), v.null()),
  projectId: v.union(v.id("projects"), v.null()),
  chatSessionId: v.union(v.id("chatSessions"), v.null()),
  nodeId: v.union(v.string(), v.null()),
  batchIndex: v.union(v.number(), v.null()),
  score: v.number(),
  reason: v.union(v.literal("contains"), v.literal("similar")),
  matchedTerms: v.array(v.string()),
});

export const hydrateHits = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    scored: v.array(
      v.object({
        id: v.id("searchDocuments"),
        score: v.number(),
      }),
    ),
  },
  returns: v.array(searchHitValidator),
  handler: async (ctx, { userId, query, scored }) => {
    const hits = [];
    for (const item of scored) {
      const doc = await ctx.db.get(item.id);
      if (!doc || doc.userId !== userId) continue;
      if (!hasReadyEmbedding(doc.embedding)) continue;

      const file = await ctx.db.get(doc.fileId);
      if (!file || file.userId !== userId) continue;

      if (doc.kind === "chat") {
        if (!doc.chatMessageId) continue;
        const msg = await ctx.db.get(doc.chatMessageId);
        if (!msg) continue;
      }
      let batchIndex: number | null = null;
      if (doc.kind === "idea") {
        if (!doc.sessionId || !doc.nodeId) continue;
        const graphRow = await ctx.db
          .query("sessionConceptGraphs")
          .withIndex("by_session", (q) => q.eq("sessionId", doc.sessionId!))
          .first();
        const stillThere = graphRow?.graph.nodes.some((n) => n.id === doc.nodeId);
        if (!stillThere) continue;
        batchIndex = batchIndexForId(graphRow?.graph.batches, doc.batchId);
        if (batchIndex == null && graphRow) {
          batchIndex = batchIndexForId(
            graphRow.graph.batches,
            batchIdForNode(graphRow.graph, doc.nodeId),
          );
        }
      }

      const explained = explainSearchHit(
        query,
        doc.title,
        doc.embeddingText || doc.snippet,
      );
      hits.push({
        kind: doc.kind,
        title: doc.title,
        snippet: explained.snippet || doc.snippet,
        fileId: doc.fileId,
        sessionId: doc.sessionId ?? null,
        projectId: file.projectId ?? null,
        chatSessionId: doc.chatSessionId ?? null,
        nodeId: doc.nodeId ?? null,
        batchIndex,
        score: item.score,
        reason: explained.reason,
        matchedTerms: explained.matchedTerms,
      });
    }
    return hits;
  },
});

export const enqueueBackfillForUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const file of files) {
      await enqueueNoteSearch(ctx, file._id, true);
      const chatSessions = await ctx.db
        .query("chatSessions")
        .withIndex("by_file", (q) => q.eq("fileId", file._id))
        .collect();
      for (const chat of chatSessions) {
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_chat_session", (q) => q.eq("chatSessionId", chat._id))
          .collect();
        for (const msg of messages) {
          await enqueueChatMessageSearch(ctx, {
            userId,
            messageId: msg._id,
            retryPending: true,
          });
        }
      }
    }
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      await syncIdeasForSession(ctx, session._id, true);
    }
    return null;
  },
});
