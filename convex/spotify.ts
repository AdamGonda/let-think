import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getOauthStateByState = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    return await ctx.db
      .query("spotifyOauthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .unique();
  },
});

export const insertOauthState = internalMutation({
  args: {
    state: v.string(),
    codeVerifier: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("spotifyOauthStates", args);
  },
});

export const deleteOauthState = internalMutation({
  args: { id: v.id("spotifyOauthStates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const deleteOauthStatesForUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("spotifyOauthStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});

export const upsertConnection = internalMutation({
  args: {
    userId: v.id("users"),
    spotifyUserId: v.string(),
    displayName: v.optional(v.string()),
    refreshToken: v.string(),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const payload = {
      userId: args.userId,
      spotifyUserId: args.spotifyUserId,
      displayName: args.displayName,
      refreshToken: args.refreshToken,
      accessToken: args.accessToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      scope: args.scope,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("spotifyConnections", payload);
  },
});

export const patchConnectionTokens = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
  },
  handler: async (ctx, { userId, accessToken, accessTokenExpiresAt }) => {
    const existing = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) {
      throw new Error("No Spotify connection");
    }
    await ctx.db.patch(existing._id, {
      accessToken,
      accessTokenExpiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const getConnectionByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("spotifyConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

const connectionStatusValidator = v.union(
  v.object({ connected: v.literal(false) }),
  v.object({
    connected: v.literal(true),
    spotifyUserId: v.string(),
    displayName: v.optional(v.string()),
    accessTokenExpiresAt: v.number(),
    scope: v.string(),
  }),
);

export const getConnectionStatus = query({
  args: {},
  returns: connectionStatusValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { connected: false as const };
    }
    const row = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) {
      return { connected: false as const };
    }
    return {
      connected: true as const,
      spotifyUserId: row.spotifyUserId,
      displayName: row.displayName,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      scope: row.scope,
    };
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.object({
    ok: v.literal(true),
    removedConnection: v.boolean(),
    removedOauthStates: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const existing = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const removedConnection = Boolean(existing);
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const oauthStates = await ctx.db
      .query("spotifyOauthStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of oauthStates) {
      await ctx.db.delete(row._id);
    }
    const removedOauthStates = oauthStates.length;
    return {
      ok: true as const,
      removedConnection,
      removedOauthStates,
    };
  },
});
