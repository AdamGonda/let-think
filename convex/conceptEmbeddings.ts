import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const conceptNodeValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
});

function buildConceptNodeEmbeddingText(
  node: { name: string; description?: string }
): string {
  const name = node.name.trim();
  const description = node.description?.trim();
  return description ? `${name}\n${description}` : name;
}

// Lightweight deterministic hash for content-change tracking.
function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function makeNodeContentHash(node: {
  name: string;
  description?: string;
}): string {
  return hashString(buildConceptNodeEmbeddingText(node));
}

async function requireSessionOwnerById(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  userId: Id<"users">
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new Error("Session not found or access denied");
  }
}

export const enqueueConceptNodesForEmbedding = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    batchId: v.string(),
    nodes: v.array(conceptNodeValidator),
  },
  handler: async (ctx, { sessionId, userId, batchId, nodes }) => {
    await requireSessionOwnerById(ctx, sessionId, userId);
    console.info("[concept-embeddings] enqueue.start", {
      sessionId,
      userId,
      batchId,
      incomingNodeCount: nodes.length,
    });

    const queuedNodeIds: string[] = [];
    const now = Date.now();
    for (const node of nodes) {
      const embeddingText = buildConceptNodeEmbeddingText(node);
      const contentHash = makeNodeContentHash(node);
      const existing = await ctx.db
        .query("conceptNodeEmbeddings")
        .withIndex("by_session_node", (q) =>
          q.eq("sessionId", sessionId).eq("nodeId", node.id)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("conceptNodeEmbeddings", {
          sessionId,
          userId,
          nodeId: node.id,
          nodeName: node.name,
          ...(node.description ? { nodeDescription: node.description } : {}),
          embeddingText,
          contentHash,
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        });
        queuedNodeIds.push(node.id);
        console.info("[concept-embeddings] enqueue.inserted", {
          sessionId,
          nodeId: node.id,
        });
        continue;
      }

      if (existing.contentHash === contentHash && existing.syncStatus === "success") {
        console.info("[concept-embeddings] enqueue.skip.unchanged_success", {
          sessionId,
          nodeId: node.id,
        });
        continue;
      }

      await ctx.db.patch(existing._id, {
        nodeName: node.name,
        nodeDescription: node.description,
        embeddingText,
        contentHash,
        syncStatus: "pending",
        syncError: undefined,
        updatedAt: now,
      });
      queuedNodeIds.push(node.id);
      console.info("[concept-embeddings] enqueue.updated_pending", {
        sessionId,
        nodeId: node.id,
        previousStatus: existing.syncStatus,
      });
    }

    if (queuedNodeIds.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.conceptEmbeddingsActions.processConceptNodeEmbeddings,
        {
          sessionId,
          userId,
          batchId,
          nodeIds: queuedNodeIds,
        }
      );
      console.info("[concept-embeddings] enqueue.scheduled", {
        sessionId,
        batchId,
        queuedNodeIds,
      });
    } else {
      console.info("[concept-embeddings] enqueue.noop", {
        sessionId,
        batchId,
      });
    }

    console.info("[concept-embeddings] enqueue.done", {
      sessionId,
      batchId,
      queuedCount: queuedNodeIds.length,
    });
    return { queuedNodeIds };
  },
});

export const getEmbeddingsForNodes = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    nodeIds: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, userId, nodeIds }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return [];
    const rows = await Promise.all(
      nodeIds.map((nodeId) =>
        ctx.db
          .query("conceptNodeEmbeddings")
          .withIndex("by_session_node", (q) =>
            q.eq("sessionId", sessionId).eq("nodeId", nodeId)
          )
          .first()
      )
    );
    return rows.filter((row) => row != null);
  },
});

export const listSuccessfulEmbeddingsForSession = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, { sessionId, userId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return [];
    const rows = await ctx.db
      .query("conceptNodeEmbeddings")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return rows.filter(
      (row) =>
        row.syncStatus === "success" &&
        typeof row.weaviateObjectId === "string" &&
        row.weaviateObjectId.length > 0 &&
        typeof row.embeddingModel === "string" &&
        typeof row.embeddingDimension === "number"
    );
  },
});

export const upsertSessionCentroidPending = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    weaviateCollection: v.string(),
    sourceNodeCount: v.number(),
  },
  handler: async (
    ctx,
    { sessionId, userId, weaviateCollection, sourceNodeCount }
  ) => {
    await requireSessionOwnerById(ctx, sessionId, userId);
    const now = Date.now();
    const existing = await ctx.db
      .query("sessionCentroidEmbeddings")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (!existing) {
      return await ctx.db.insert("sessionCentroidEmbeddings", {
        sessionId,
        userId,
        weaviateCollection,
        sourceNodeCount,
        syncStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      userId,
      weaviateCollection,
      sourceNodeCount,
      syncStatus: "pending",
      syncError: undefined,
      updatedAt: now,
    });
    return existing._id;
  },
});

export const markSessionCentroidProcessing = internalMutation({
  args: { centroidId: v.id("sessionCentroidEmbeddings"), sourceNodeCount: v.number() },
  handler: async (ctx, { centroidId, sourceNodeCount }) => {
    await ctx.db.patch(centroidId, {
      syncStatus: "processing",
      sourceNodeCount,
      syncError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markSessionCentroidSuccess = internalMutation({
  args: {
    centroidId: v.id("sessionCentroidEmbeddings"),
    weaviateObjectId: v.string(),
    embeddingModel: v.string(),
    embeddingDimension: v.number(),
    sourceNodeCount: v.number(),
  },
  handler: async (
    ctx,
    {
      centroidId,
      weaviateObjectId,
      embeddingModel,
      embeddingDimension,
      sourceNodeCount,
    }
  ) => {
    const now = Date.now();
    await ctx.db.patch(centroidId, {
      syncStatus: "success",
      weaviateObjectId,
      embeddingModel,
      embeddingDimension,
      sourceNodeCount,
      syncError: undefined,
      lastSyncedAt: now,
      updatedAt: now,
    });
  },
});

export const markSessionCentroidFailure = internalMutation({
  args: {
    centroidId: v.id("sessionCentroidEmbeddings"),
    syncError: v.string(),
    sourceNodeCount: v.number(),
  },
  handler: async (ctx, { centroidId, syncError, sourceNodeCount }) => {
    await ctx.db.patch(centroidId, {
      syncStatus: "failed",
      syncError,
      sourceNodeCount,
      updatedAt: Date.now(),
    });
  },
});

export const listSessionCentroidRefs = query({
  args: {
    projectId: v.optional(v.id("projects")),
    sessionIds: v.optional(v.array(v.id("sessions"))),
  },
  handler: async (ctx, { projectId, sessionIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const sessionsById = new Map(sessions.map((session) => [session._id, session]));

    const allowedSessionIds = sessionIds ? new Set(sessionIds) : null;

    const centroidRows = await ctx.db
      .query("sessionCentroidEmbeddings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const projectNameById = new Map<Id<"projects">, string>();
    const resolveProjectName = async (
      candidateProjectId: Id<"projects"> | undefined
    ): Promise<string | null> => {
      if (!candidateProjectId) return null;
      const cached = projectNameById.get(candidateProjectId);
      if (cached) return cached;
      const project = await ctx.db.get(candidateProjectId);
      if (!project || project.userId !== userId) return null;
      projectNameById.set(candidateProjectId, project.name);
      return project.name;
    };

    const out: Array<{
      sessionId: Id<"sessions">;
      sessionTitle: string;
      projectId?: Id<"projects">;
      projectName: string | null;
      weaviateCollection: string;
      weaviateObjectId: string;
      embeddingModel?: string;
      embeddingDimension?: number;
      sourceNodeCount: number;
      syncStatus: "success";
      updatedAt: number;
      lastSyncedAt?: number;
    }> = [];

    for (const row of centroidRows) {
      if (row.syncStatus !== "success" || !row.weaviateObjectId) continue;
      const session = sessionsById.get(row.sessionId);
      if (!session) continue;
      if (projectId !== undefined && session.projectId !== projectId) continue;
      if (allowedSessionIds && !allowedSessionIds.has(session._id)) continue;
      const projectName = await resolveProjectName(session.projectId);
      out.push({
        sessionId: session._id,
        sessionTitle: session.title,
        projectId: session.projectId,
        projectName,
        weaviateCollection: row.weaviateCollection,
        weaviateObjectId: row.weaviateObjectId,
        embeddingModel: row.embeddingModel,
        embeddingDimension: row.embeddingDimension,
        sourceNodeCount: row.sourceNodeCount,
        syncStatus: "success",
        updatedAt: row.updatedAt,
        lastSyncedAt: row.lastSyncedAt,
      });
    }
    return out;
  },
});

export const markEmbeddingProcessing = internalMutation({
  args: { embeddingId: v.id("conceptNodeEmbeddings") },
  handler: async (ctx, { embeddingId }) => {
    await ctx.db.patch(embeddingId, {
      syncStatus: "processing",
      syncError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markEmbeddingSuccess = internalMutation({
  args: {
    embeddingId: v.id("conceptNodeEmbeddings"),
    embeddingModel: v.string(),
    embeddingDimension: v.number(),
    weaviateObjectId: v.string(),
  },
  handler: async (
    ctx,
    { embeddingId, embeddingModel, embeddingDimension, weaviateObjectId }
  ) => {
    const now = Date.now();
    await ctx.db.patch(embeddingId, {
      syncStatus: "success",
      embeddingModel,
      embeddingDimension,
      weaviateObjectId,
      syncError: undefined,
      lastSyncedAt: now,
      updatedAt: now,
    });
  },
});

export const markEmbeddingFailure = internalMutation({
  args: {
    embeddingId: v.id("conceptNodeEmbeddings"),
    syncError: v.string(),
  },
  handler: async (ctx, { embeddingId, syncError }) => {
    await ctx.db.patch(embeddingId, {
      syncStatus: "failed",
      syncError,
      updatedAt: Date.now(),
    });
  },
});
