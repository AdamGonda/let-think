import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type Context = QueryCtx | MutationCtx;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseEmailList(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
  );
}

export async function isEmailAllowed(ctx: Context, email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const adminEmails = parseEmailList(process.env.CONVEX_ADMIN_EMAILS);
  if (adminEmails.has(normalized)) return true;

  const allowlisted = await ctx.db
    .query("betaAllowlist")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  return Boolean(allowlisted);
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
  if (!adminEmails.has(email)) {
    throw new Error("Unauthorized");
  }

  return { userId, email };
}
