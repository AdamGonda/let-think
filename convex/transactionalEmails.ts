"use node";

import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { normalizeEmail } from "./lib/access";
import { sendTransactionalEmail } from "./lib/transactionalEmails/resend";
import {
  buildAllowlistApprovedTemplate,
  buildCustomEmailTemplate,
} from "./lib/transactionalEmails/templates";

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

    const content = buildAllowlistApprovedTemplate({ firstName });
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

const MAX_RECIPIENTS_PER_SEND = 50;

function parseRecipientList(rawTo: string): string[] {
  const recipients = [
    ...new Set(
      rawTo
        .split(/[,\n;]/)
        .map((entry) => normalizeEmail(entry))
        .filter(Boolean)
    ),
  ];
  if (recipients.length === 0) {
    throw new Error("At least one recipient email is required");
  }
  if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
    throw new Error(
      `Too many recipients (${recipients.length}). Max ${MAX_RECIPIENTS_PER_SEND} per send.`
    );
  }
  return recipients;
}

export const sendCustomEmailFromAdmin = action({
  args: {
    to: v.string(),
    subject: v.string(),
    bodyMarkdown: v.string(),
  },
  returns: v.object({
    sentCount: v.number(),
    recipients: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await ctx.runQuery(api.admin.assertAdmin, {});

    const recipients = parseRecipientList(args.to);
    const content = buildCustomEmailTemplate({
      subject: args.subject,
      bodyMarkdown: args.bodyMarkdown,
    });

    for (const recipient of recipients) {
      await sendTransactionalEmail({ to: recipient, content });
    }

    return { sentCount: recipients.length, recipients };
  },
});
