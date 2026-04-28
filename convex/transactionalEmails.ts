"use node";

import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { normalizeEmail } from "./lib/access";
import { sendTransactionalEmail } from "./lib/transactionalEmails/resend";
import { buildAllowlistApprovedTemplate } from "./lib/transactionalEmails/templates";

function getAppUrl(): string {
  const appUrl = process.env.CONVEX_SITE_URL?.trim();
  if (!appUrl) {
    throw new Error("Missing CONVEX_SITE_URL environment variable");
  }
  return appUrl;
}

export const sendAllowlistApprovedEmail = internalAction({
  args: { email: v.string(), firstName: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) {
      throw new Error("Email is required");
    }
    const firstName = args.firstName.trim();
    if (!firstName) {
      throw new Error("First name is required");
    }

    const content = buildAllowlistApprovedTemplate({
      appUrl: getAppUrl(),
      firstName,
    });
    await sendTransactionalEmail({
      to: email,
      content,
    });

    return null;
  },
});

export const sendAllowlistApprovedEmailFromAdmin = action({
  args: { email: v.string(), firstName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runQuery(api.admin.assertAdmin, {});
    await ctx.runAction(internal.transactionalEmails.sendAllowlistApprovedEmail, {
      email: args.email,
      firstName: args.firstName,
    });
    return null;
  },
});
