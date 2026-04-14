"use node";

import crypto from "node:crypto";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** Scopes required for Web Playback SDK + playlist browse + transport. */
export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
].join(" ");

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("SPOTIFY_CLIENT_ID is not configured");
  }
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret) {
    headers.Authorization =
      "Basic " +
      Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Spotify token refresh failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  const access_token = json.access_token as string | undefined;
  const expires_in = json.expires_in as number | undefined;
  if (!access_token || expires_in === undefined) {
    throw new Error("Spotify token refresh: missing access_token or expires_in");
  }
  return {
    access_token,
    expires_in,
    refresh_token: json.refresh_token as string | undefined,
  };
}

async function ensureAccessToken(
  ctx: ActionCtx,
  userId: NonNullable<Awaited<ReturnType<typeof getAuthUserId>>>,
): Promise<string> {
  const row = await ctx.runQuery(internal.spotify.getConnectionByUser, {
    userId,
  });
  if (!row) {
    throw new Error("Spotify is not connected");
  }
  const skewMs = 60_000;
  if (row.accessTokenExpiresAt > Date.now() + skewMs) {
    return row.accessToken;
  }
  const refreshed = await refreshAccessToken(row.refreshToken);
  const expiresAt = Date.now() + refreshed.expires_in * 1000;
  const newRefresh = refreshed.refresh_token ?? row.refreshToken;
  await ctx.runMutation(internal.spotify.upsertConnection, {
    userId,
    spotifyUserId: row.spotifyUserId,
    displayName: row.displayName,
    refreshToken: newRefresh,
    accessToken: refreshed.access_token,
    accessTokenExpiresAt: expiresAt,
    scope: row.scope,
  });
  return refreshed.access_token;
}

export const beginOAuth = action({
  args: {},
  returns: v.object({ authorizationUrl: v.string() }),
  handler: async (ctx): Promise<{ authorizationUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new Error(
        "Spotify OAuth is not configured (SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI)",
      );
    }

    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(
      crypto.createHash("sha256").update(codeVerifier).digest(),
    );
    const state = base64url(crypto.randomBytes(24));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await ctx.runMutation(internal.spotify.insertOauthState, {
      state,
      codeVerifier,
      userId,
      expiresAt,
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: SPOTIFY_SCOPES,
      redirect_uri: redirectUri,
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });

    return {
      authorizationUrl:
        "https://accounts.spotify.com/authorize?" + params.toString(),
    };
  },
});

export const getPlaybackAccessToken = action({
  args: {},
  returns: v.object({
    accessToken: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx): Promise<{ accessToken: string; expiresAt: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const row = await ctx.runQuery(internal.spotify.getConnectionByUser, {
      userId,
    });
    if (!row) {
      throw new Error("Spotify is not connected");
    }
    const accessToken = await ensureAccessToken(ctx, userId);
    const updated = await ctx.runQuery(internal.spotify.getConnectionByUser, {
      userId,
    });
    return {
      accessToken,
      expiresAt: updated?.accessTokenExpiresAt ?? Date.now() + 3_600_000,
    };
  },
});

const playlistItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  uri: v.string(),
  imageUrl: v.optional(v.union(v.string(), v.null())),
});

export const listPlaylists = action({
  args: {},
  returns: v.object({
    playlists: v.array(playlistItemValidator),
  }),
  handler: async (
    ctx,
  ): Promise<{
    playlists: Array<{
      id: string;
      name: string;
      uri: string;
      imageUrl?: string | null;
    }>;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const token = await ensureAccessToken(ctx, userId);
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as {
      items?: Array<{
        id: string;
        name: string;
        uri: string;
        images?: Array<{ url?: string }>;
      }>;
    };
    if (!res.ok) {
      throw new Error(`Spotify list playlists failed: ${res.status}`);
    }
    const playlists = (json.items ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      uri: p.uri,
      imageUrl: p.images?.[0]?.url ?? null,
    }));
    return { playlists };
  },
});

const playbackArgs = v.union(
  v.object({
    command: v.literal("play"),
    deviceId: v.string(),
    contextUri: v.string(),
  }),
  v.object({
    command: v.literal("pause"),
    deviceId: v.string(),
  }),
  v.object({
    command: v.literal("resume"),
    deviceId: v.string(),
  }),
  v.object({
    command: v.literal("next"),
    deviceId: v.string(),
  }),
  v.object({
    command: v.literal("previous"),
    deviceId: v.string(),
  }),
  v.object({
    command: v.literal("seek"),
    deviceId: v.string(),
    positionMs: v.number(),
  }),
);

export const playback = action({
  args: { input: playbackArgs },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, { input }): Promise<{ ok: true }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const token = await ensureAccessToken(ctx, userId);
    const deviceQ = `?device_id=${encodeURIComponent(input.deviceId)}`;

    if (input.command === "play") {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/play${deviceQ}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ context_uri: input.contextUri }),
        },
      );
      if (res.status !== 204 && res.status !== 202) {
        const t = await res.text();
        throw new Error(`Spotify play failed: ${res.status} ${t}`);
      }
      return { ok: true as const };
    }

    if (input.command === "pause") {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/pause${deviceQ}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status !== 204 && res.status !== 202) {
        const t = await res.text();
        throw new Error(`Spotify pause failed: ${res.status} ${t}`);
      }
      return { ok: true as const };
    }

    if (input.command === "resume") {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/play${deviceQ}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      if (res.status !== 204 && res.status !== 202) {
        const t = await res.text();
        throw new Error(`Spotify resume failed: ${res.status} ${t}`);
      }
      return { ok: true as const };
    }

    if (input.command === "next") {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/next${deviceQ}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status !== 204 && res.status !== 202) {
        const t = await res.text();
        throw new Error(`Spotify next failed: ${res.status} ${t}`);
      }
      return { ok: true as const };
    }

    if (input.command === "seek") {
      const ms = Math.max(0, Math.floor(input.positionMs));
      const seekQ = `${deviceQ}&position_ms=${encodeURIComponent(String(ms))}`;
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/seek${seekQ}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status !== 204 && res.status !== 202) {
        const t = await res.text();
        throw new Error(`Spotify seek failed: ${res.status} ${t}`);
      }
      return { ok: true as const };
    }

    const res = await fetch(
      `https://api.spotify.com/v1/me/player/previous${deviceQ}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.status !== 204 && res.status !== 202) {
      const t = await res.text();
      throw new Error(`Spotify previous failed: ${res.status} ${t}`);
    }
    return { ok: true as const };
  },
});
