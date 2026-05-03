import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminUserId } from "./lib/access";

export const requireAdminIdentityInternal = internalQuery({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
  }),
  handler: async (ctx) => {
    return await requireAdminUserId(ctx);
  },
});
