import { v } from "convex/values";
import { mutation, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Direct-upload URL so the browser never puts image bytes in action args. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

export async function imageUrlsForIds(
  ctx: QueryCtx,
  ids: Id<"_storage">[] | undefined,
): Promise<string[] | undefined> {
  if (!ids?.length) return undefined;
  const urls: string[] = [];
  for (const id of ids) {
    const url = await ctx.storage.getUrl(id);
    if (url) urls.push(url);
  }
  return urls.length > 0 ? urls : undefined;
}
