import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type ProjectionRunResult = {
  runId: Id<"globalVectorProjectionRuns">;
  processedCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
};

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
