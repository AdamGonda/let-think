import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
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
