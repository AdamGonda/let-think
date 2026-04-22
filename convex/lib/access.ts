import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type Context = QueryCtx | MutationCtx;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalizeEmailForMatching(email: string): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) return normalized;

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!domain) return normalized;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusIndex = local.indexOf("+");
    const localWithoutAlias = plusIndex >= 0 ? local.slice(0, plusIndex) : local;
    const dotlessLocal = localWithoutAlias.replace(/\./g, "");
    return `${dotlessLocal}@gmail.com`;
  }

  return normalized;
}

function emailsMatch(left: string, right: string): boolean {
  return canonicalizeEmailForMatching(left) === canonicalizeEmailForMatching(right);
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
    value
        .split(",")
        .map((email) => normalizeEmail(email))
        .filter(Boolean)
    ),
  ];
}

export async function isEmailAllowed(ctx: Context, email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const adminEmails = parseEmailList(process.env.CONVEX_ADMIN_EMAILS);
  if (adminEmails.some((adminEmail) => emailsMatch(adminEmail, normalized))) {
    return true;
  }

  const allowlistedExact = await ctx.db
    .query("betaAllowlist")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  if (allowlistedExact) {
    return true;
  }

  const allowlistedEntries = await ctx.db.query("betaAllowlist").collect();
  return allowlistedEntries.some((entry) => emailsMatch(entry.email, normalized));
}

export async function requireAdminUserId(ctx: Context) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  const email = normalizeEmail(user?.email ?? "");
  if (!email) {
    throw new Error("Unauthorized");
  }

  const adminEmails = parseEmailList(process.env.CONVEX_ADMIN_EMAILS);
  if (!adminEmails.some((adminEmail) => emailsMatch(adminEmail, email))) {
    throw new Error("Unauthorized");
  }

  return { userId, email };
}
