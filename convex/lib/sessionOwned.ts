import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function deleteRowsBySession(
  ctx: MutationCtx,
  table:
    | "messages"
    | "chatMessages"
    | "sessionConceptGraphs"
    | "sessionCanvases"
    | "sessionDrafts",
  sessionId: Id<"sessions">,
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

/** Rows keyed by ideation session id. */
export async function deleteSessionOwnedRows(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
) {
  await deleteRowsBySession(ctx, "messages", sessionId);
  await deleteRowsBySession(ctx, "chatMessages", sessionId);
  await deleteRowsBySession(ctx, "sessionConceptGraphs", sessionId);
  await deleteRowsBySession(ctx, "sessionCanvases", sessionId);
  await deleteRowsBySession(ctx, "sessionDrafts", sessionId);
}
