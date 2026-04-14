/**
 * Parse Spotify OAuth redirect query params (set by Convex HTTP callback).
 */
export function parseSpotifyOAuthReturn(search: string): {
  connected: boolean;
  error: string | null;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  if (params.get("spotify_connected") === "1") {
    return { connected: true, error: null };
  }
  const err = params.get("spotify_error");
  return { connected: false, error: err };
}

const SPOTIFY_APP_OWNER_PREMIUM_MESSAGE =
  "Spotify requires an active Premium subscription on the Spotify account that owns this app in the Developer Dashboard (not only the account you use to log in). After upgrading, changes can take a few hours. In development mode, add testers under Dashboard → Users and Access.";

const SPOTIFY_LISTENER_PREMIUM_MESSAGE =
  "Spotify Premium is required for in-browser playback. Connect with a Premium Spotify account (or log out of Spotify and reconnect with the right one).";

export function getSpotifyOAuthErrorMessage(error: string): string {
  const normalized = error.toLowerCase();
  if (isSpotifyAppOwnerPremiumError(error)) {
    return SPOTIFY_APP_OWNER_PREMIUM_MESSAGE;
  }
  if (isSpotifyPremiumRequiredError(error)) {
    return SPOTIFY_LISTENER_PREMIUM_MESSAGE;
  }
  if (normalized.startsWith("access_denied")) {
    return "Spotify connection was canceled.";
  }
  return `Spotify connection failed: ${error}`;
}

/** Spotify Developer policy: Web Playback / some APIs need Premium on the dashboard app owner. */
export function isSpotifyAppOwnerPremiumError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("owner of the app") ||
    normalized.includes("for the owner of the app")
  );
}

export function isSpotifyPremiumRequiredError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (isSpotifyAppOwnerPremiumError(message)) {
    return false;
  }
  return (
    normalized.includes("active premium required") ||
    normalized.includes("premium required") ||
    normalized.includes("premium subscription required")
  );
}

export function getSpotifyRuntimeErrorMessage(error: string): string {
  if (isSpotifyAppOwnerPremiumError(error)) {
    return SPOTIFY_APP_OWNER_PREMIUM_MESSAGE;
  }
  if (isSpotifyPremiumRequiredError(error)) {
    return SPOTIFY_LISTENER_PREMIUM_MESSAGE;
  }
  return error;
}

const SPOTIFY_OAUTH_ERROR_STORAGE_KEY = "spotify_oauth_error";

export function storeSpotifyOAuthError(error: string): void {
  window.sessionStorage.setItem(SPOTIFY_OAUTH_ERROR_STORAGE_KEY, error);
}

export function consumeStoredSpotifyOAuthErrorMessage(): string | null {
  const error = window.sessionStorage.getItem(SPOTIFY_OAUTH_ERROR_STORAGE_KEY);
  if (!error) {
    return null;
  }
  window.sessionStorage.removeItem(SPOTIFY_OAUTH_ERROR_STORAGE_KEY);
  return getSpotifyOAuthErrorMessage(error);
}

export function clearStoredSpotifyOAuthError(): void {
  window.sessionStorage.removeItem(SPOTIFY_OAUTH_ERROR_STORAGE_KEY);
}

/** Remove spotify_* params from the URL without reloading. */
export function stripSpotifyOAuthParams(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("spotify_")) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}
