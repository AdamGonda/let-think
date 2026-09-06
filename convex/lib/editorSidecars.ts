import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type DbCtx = QueryCtx | MutationCtx;

/** First defined value wins, including empty string. */
export function resolveSidecarText(
  sidecar: string | undefined,
  ...leftovers: Array<string | undefined>
): string {
  if (sidecar !== undefined) return sidecar;
  for (const leftover of leftovers) {
    if (leftover !== undefined) return leftover;
  }
  return "";
}

/** Hydration race: empty local state must not wipe stored text. */
export function skipEmptyOverwrite(next: string, existing: string): boolean {
  return next === "" && existing !== "";
}

export async function loadSessionDraft(
  ctx: DbCtx,
  sessionId: Id<"sessions">,
  leftover?: string,
): Promise<string> {
  const row = await ctx.db
    .query("sessionDrafts")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  return resolveSidecarText(row?.draftInput, leftover);
}

export async function upsertSessionDraft(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  draftInput: string,
): Promise<void> {
  const existing = await ctx.db
    .query("sessionDrafts")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { draftInput });
    return;
  }
  await ctx.db.insert("sessionDrafts", { sessionId, draftInput });
}

export async function loadFileNotes(
  ctx: DbCtx,
  fileId: Id<"files">,
  leftoverFile?: string,
  leftoverSession?: string,
): Promise<string> {
  const row = await ctx.db
    .query("fileNotes")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .first();
  return resolveSidecarText(row?.thinkingNotes, leftoverFile, leftoverSession);
}

export async function upsertFileNotes(
  ctx: MutationCtx,
  fileId: Id<"files">,
  thinkingNotes: string,
): Promise<void> {
  const existing = await ctx.db
    .query("fileNotes")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { thinkingNotes });
    return;
  }
  await ctx.db.insert("fileNotes", { fileId, thinkingNotes });
}

export async function deleteFileNotes(
  ctx: MutationCtx,
  fileId: Id<"files">,
): Promise<void> {
  const rows = await ctx.db
    .query("fileNotes")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}
