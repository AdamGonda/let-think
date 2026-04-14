import { describe, expect, it } from "vitest";
import {
  getSpotifyOAuthErrorMessage,
  getSpotifyRuntimeErrorMessage,
  parseSpotifyOAuthReturn,
} from "./spotifyAuth";

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

describe("getSpotifyOAuthErrorMessage", () => {
  it("returns app-owner guidance when Spotify requires Premium on the dashboard owner", () => {
    expect(
      getSpotifyOAuthErrorMessage(
        "spotify_me_failed:403:Active premium subscription required for the owner of the app. When the subscription status changes, it can take a few hours before requ",
      ),
    ).toBe(
      "Spotify requires an active Premium subscription on the Spotify account that owns this app in the Developer Dashboard (not only the account you use to log in). After upgrading, changes can take a few hours. In development mode, add testers under Dashboard → Users and Access.",
    );
  });

  it("returns Premium guidance for premium-required errors", () => {
    expect(
      getSpotifyOAuthErrorMessage(
        "spotify_me_failed:403:Active Premium required",
      ),
    ).toBe(
      "Spotify Premium is required for in-browser playback. Connect with a Premium Spotify account (or log out of Spotify and reconnect with the right one).",
    );
  });

  it("returns cancellation message for access_denied", () => {
    expect(getSpotifyOAuthErrorMessage("access_denied")).toBe(
      "Spotify connection was canceled.",
    );
  });
});

describe("getSpotifyRuntimeErrorMessage", () => {
  it("returns Premium guidance for premium-required runtime errors", () => {
    expect(
      getSpotifyRuntimeErrorMessage("Player command failed: Active Premium required"),
    ).toBe(
      "Spotify Premium is required for in-browser playback. Connect with a Premium Spotify account (or log out of Spotify and reconnect with the right one).",
    );
  });
});
