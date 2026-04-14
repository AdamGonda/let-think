import { describe, expect, it } from "vitest";
import { parseSpotifyOAuthReturn } from "./spotifyAuth";

describe("parseSpotifyOAuthReturn", () => {
  it("returns connected when spotify_connected=1", () => {
    expect(parseSpotifyOAuthReturn("?spotify_connected=1")).toEqual({
      connected: true,
      error: null,
    });
  });

  it("returns error param when present", () => {
    expect(
      parseSpotifyOAuthReturn("?spotify_error=access_denied"),
    ).toEqual({
      connected: false,
      error: "access_denied",
    });
  });

  it("handles search without leading ?", () => {
    expect(parseSpotifyOAuthReturn("spotify_error=bad")).toEqual({
      connected: false,
      error: "bad",
    });
  });
});
