import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAdminUserId } from "./lib/access";

type ProjectionRunResult = {
  runId: Id<"globalVectorProjectionRuns">;
  processedCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
};

export const listGlobalProjectionPoints = query({
  args: {},
  returns: v.object({
    isAdmin: v.boolean(),
    points: v.array(
      v.object({
        _id: v.id("globalVectorProjectionPoints"),
        embeddingId: v.id("conceptNodeEmbeddings"),
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        nodeId: v.string(),
        nodeName: v.string(),
        nodeDescription: v.optional(v.string()),
        weaviateObjectId: v.string(),
        x: v.number(),
        y: v.number(),
        z: v.number(),
        projectionRunId: v.id("globalVectorProjectionRuns"),
        updatedAt: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    try {
      await requireAdminUserId(ctx);
    } catch {
      return { isAdmin: false, points: [] };
    }
    const points = await ctx.db.query("globalVectorProjectionPoints").collect();
    points.sort((a, b) => a.updatedAt - b.updatedAt);
    const embeddingRows = await Promise.all(
      points.map((point) => ctx.db.get(point.embeddingId))
    );
    return {
      isAdmin: true,
      points: points.map((point, index) => ({
        _id: point._id,
        embeddingId: point.embeddingId,
        sessionId: point.sessionId,
        userId: point.userId,
        nodeId: point.nodeId,
        nodeName: embeddingRows[index]?.nodeName ?? point.nodeId,
        nodeDescription: embeddingRows[index]?.nodeDescription,
        weaviateObjectId: point.weaviateObjectId,
        x: point.x,
        y: point.y,
        z: point.z,
        projectionRunId: point.projectionRunId,
        updatedAt: point.updatedAt,
      })),
    };
  },
});

export const recomputeGlobalVectorProjection3d = action({
  args: {},
  returns: v.object({
    runId: v.id("globalVectorProjectionRuns"),
    processedCount: v.number(),
    successCount: v.number(),
    skippedCount: v.number(),
    failedCount: v.number(),
  }),
  handler: async (ctx): Promise<ProjectionRunResult> => {
    const identity: { userId: Id<"users">; email: string } = await ctx.runQuery(
      internal.adminInternal.requireAdminIdentityInternal
    );
    const result = (await ctx.runAction(
      internal.conceptEmbeddingsActions.projectAllVectorsTo3d,
      { triggeredBy: identity.userId }
    )) as ProjectionRunResult;
    return result;
  },
});
