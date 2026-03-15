import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getEmbeddingDoc = internalQuery({
  args: { embeddingId: v.id("sessionEmbeddings") },
  handler: async (ctx, { embeddingId }) => {
    return ctx.db.get(embeddingId);
  },
});
