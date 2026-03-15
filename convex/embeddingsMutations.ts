import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertMutation = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    embedding: v.array(v.float64()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { sessionId, embedding, projectId }) => {
    const existing = await ctx.db
      .query("sessionEmbeddings")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();

    const doc = { sessionId, embedding, projectId };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("sessionEmbeddings", doc);
    }
  },
});
