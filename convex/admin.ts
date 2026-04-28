import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeEmail, requireAdminUserId } from "./lib/access";

export const getWhitelist = query({
  args: {},
  returns: v.object({
    adminEmail: v.string(),
    entries: v.array(
      v.object({
        _id: v.id("betaAllowlist"),
        email: v.string(),
        addedAt: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const { email } = await requireAdminUserId(ctx);
    const entries = await ctx.db.query("betaAllowlist").collect();
    entries.sort((a, b) => a.email.localeCompare(b.email));
    return {
      adminEmail: email,
      entries: entries.map((entry) => ({
        _id: entry._id,
        email: entry.email,
        addedAt: entry.addedAt,
      })),
    };
  },
});

export const addAllowedEmail = mutation({
  args: { email: v.string() },
  returns: v.id("betaAllowlist"),
  handler: async (ctx, args) => {
    const { userId } = await requireAdminUserId(ctx);
    const email = normalizeEmail(args.email);
    if (!email) {
      throw new Error("Email is required");
    }

    const existing = await ctx.db
      .query("betaAllowlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("betaAllowlist", {
      email,
      addedAt: Date.now(),
      addedBy: userId,
    });
  },
});

export const assertAdmin = query({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdminUserId(ctx);
    return null;
  },
});

export const removeAllowedEmail = mutation({
  args: { entryId: v.id("betaAllowlist") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUserId(ctx);
    await ctx.db.delete(args.entryId);
    return null;
  },
});
