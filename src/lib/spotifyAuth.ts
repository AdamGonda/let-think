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
