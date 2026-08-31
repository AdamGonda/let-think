import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { deleteSearchDocumentsBySession } from "../searchDocuments";

async function deleteRowsBySession(
  ctx: MutationCtx,
  table: "messages" | "chatMessages" | "sessionConceptGraphs",
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

/** Graph-lane rows keyed by ideation session id. */
export async function deleteSessionOwnedRows(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
) {
  await deleteRowsBySession(ctx, "messages", sessionId);
  await deleteRowsBySession(ctx, "chatMessages", sessionId);
  await deleteRowsBySession(ctx, "sessionConceptGraphs", sessionId);
  await deleteSearchDocumentsBySession(ctx, sessionId);
}
