import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function parseJsonSafe(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function frontendOrigin(): string {
  return (
    process.env.SPOTIFY_FRONTEND_ORIGIN ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173"
  );
}

function redirectWithError(message: string): Response {
  const base = frontendOrigin().replace(/\/$/, "");
  return Response.redirect(
    `${base}/?spotify_error=${encodeURIComponent(message)}`,
    302,
  );
}

function redirectSuccess(): Response {
  const base = frontendOrigin().replace(/\/$/, "");
  return Response.redirect(`${base}/?spotify_connected=1`, 302);
}

export const spotifyOAuthCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return redirectWithError(err);
  }
  if (!code || !state) {
    return redirectWithError("missing_code_or_state");
  }

  const row = await ctx.runQuery(internal.spotify.getOauthStateByState, {
    state,
  });
  if (!row || row.expiresAt < Date.now()) {
    return redirectWithError("invalid_or_expired_state");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return redirectWithError("server_spotify_not_configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: row.codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret) {
    headers.Authorization =
      "Basic " + btoa(`${clientId}:${clientSecret}`);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body,
  });
  const tokenText = await tokenRes.text();
  const tokenJson = parseJsonSafe(tokenText);
  if (!tokenRes.ok) {
    await ctx.runMutation(internal.spotify.deleteOauthState, { id: row._id });
    return redirectWithError(
      `token_exchange_failed:${tokenRes.status}:${tokenText.slice(0, 200)}`,
    );
  }
  if (!tokenJson) {
    await ctx.runMutation(internal.spotify.deleteOauthState, { id: row._id });
    return redirectWithError(
      `token_exchange_invalid_json:${tokenRes.status}:${tokenText.slice(0, 200)}`,
    );
  }

  const accessToken = tokenJson.access_token as string | undefined;
  const refreshToken = tokenJson.refresh_token as string | undefined;
  const expiresIn = tokenJson.expires_in as number | undefined;
  const scope = tokenJson.scope as string | undefined;
  if (!accessToken || !refreshToken || expiresIn === undefined || !scope) {
    await ctx.runMutation(internal.spotify.deleteOauthState, { id: row._id });
    return redirectWithError("token_response_incomplete");
  }

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meText = await meRes.text();
  const meJson = parseJsonSafe(meText) as
    | {
        id?: string;
        display_name?: string;
      }
    | null;
  if (!meRes.ok || !meJson?.id) {
    await ctx.runMutation(internal.spotify.deleteOauthState, { id: row._id });
    return redirectWithError(
      `spotify_me_failed:${meRes.status}:${meText.slice(0, 200)}`,
    );
  }

  const accessTokenExpiresAt = Date.now() + expiresIn * 1000;

  await ctx.runMutation(internal.spotify.upsertConnection, {
    userId: row.userId,
    spotifyUserId: meJson.id,
    displayName: meJson.display_name ?? undefined,
    refreshToken,
    accessToken,
    accessTokenExpiresAt,
    scope,
  });

  await ctx.runMutation(internal.spotify.deleteOauthState, { id: row._id });

  return redirectSuccess();
});
