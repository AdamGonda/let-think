import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type {
  SpotifyPlaybackState,
  SpotifyPlaylistSummary,
  SpotifyWebPlayer,
} from "@/lib/spotifyClient";
import { getSpotifyRuntimeErrorMessage } from "@/lib/spotifyAuth";

const SPOTIFY_SDK_SCRIPT = "https://sdk.scdn.co/spotify-player.js";

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify?.Player) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-spotify-sdk]",
    );
    const onReady = () => resolve();
    window.onSpotifyWebPlaybackSDKReady = onReady;
    if (existing) {
      if (window.Spotify?.Player) {
        resolve();
        return;
      }
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () =>
        reject(new Error("Spotify SDK script failed")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = SPOTIFY_SDK_SCRIPT;
    s.async = true;
    s.dataset.spotifySdk = "1";
    s.onerror = () => reject(new Error("Failed to load Spotify SDK"));
    document.body.appendChild(s);
  });
}

export function useSpotifyController(enabled: boolean) {
  const connection = useQuery(api.spotify.getConnectionStatus);
  const beginOAuth = useAction(api.spotifyActions.beginOAuth);
  const getPlaybackAccessToken = useAction(
    api.spotifyActions.getPlaybackAccessToken,
  );
  const listPlaylistsAction = useAction(api.spotifyActions.listPlaylists);
  const playbackAction = useAction(api.spotifyActions.playback);
  const disconnectMutation = useMutation(api.spotify.disconnect);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlaybackState | null>(
    null,
  );
  const [playerInitializing, setPlayerInitializing] = useState(false);

  const playerRef = useRef<SpotifyWebPlayer | null>(null);

  const connected =
    connection !== undefined && connection.connected === true;

  const beginLogin = useCallback(async () => {
    const { authorizationUrl } = await beginOAuth();
    window.location.href = authorizationUrl;
  }, [beginOAuth]);

  const disconnect = useCallback(async () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    setDeviceId(null);
    setPlayerState(null);
    return await disconnectMutation();
  }, [disconnectMutation]);

  const refreshPlaylists = useCallback(async () => {
    if (!connected) return;
    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const { playlists: list } = await listPlaylistsAction();
      setPlaylists(list);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to load playlists";
      setPlaylistsError(
        getSpotifyRuntimeErrorMessage(raw),
      );
    } finally {
      setPlaylistsLoading(false);
    }
  }, [connected, listPlaylistsAction]);

  /** Web Playback SDK + transfer playback to this browser device. */
  useEffect(() => {
    if (!enabled || !connected) {
      playerRef.current?.disconnect();
      playerRef.current = null;
      setDeviceId(null);
      setPlayerState(null);
      setSdkError(null);
      setPlayerInitializing(false);
      return;
    }

    let cancelled = false;
    setPlayerInitializing(true);
    setSdkError(null);

    void (async () => {
      try {
        await loadSpotifySdk();
        if (cancelled || !window.Spotify?.Player) {
          throw new Error("Spotify SDK not available");
        }
        const player = new window.Spotify.Player({
          name: "LET THINK",
          getOAuthToken: (cb) => {
            void getPlaybackAccessToken()
              .then((t) => {
                cb(t.accessToken);
              })
              .catch((err: unknown) => {
                console.error("[Spotify] getOAuthToken", err);
              });
          },
          volume: 0.85,
        });

        player.addListener("ready", (ev: unknown) => {
          const device_id = (ev as { device_id: string }).device_id;
          if (!cancelled) {
            setDeviceId(device_id);
          }
        });
        player.addListener("initialization_error", (ev: unknown) => {
          setSdkError(
            getSpotifyRuntimeErrorMessage((ev as { message: string }).message),
          );
        });
        player.addListener("authentication_error", (ev: unknown) => {
          setSdkError(
            getSpotifyRuntimeErrorMessage((ev as { message: string }).message),
          );
        });
        player.addListener("account_error", (ev: unknown) => {
          setSdkError(
            getSpotifyRuntimeErrorMessage((ev as { message: string }).message),
          );
        });
        player.addListener("player_state_changed", (state: unknown) => {
          setPlayerState(state as SpotifyPlaybackState);
        });

        playerRef.current = player as SpotifyWebPlayer;
        const ok = await player.connect();
        if (!ok && !cancelled) {
          setSdkError("Could not connect Spotify player");
        }
      } catch (e) {
        if (!cancelled) {
          setSdkError(
            getSpotifyRuntimeErrorMessage(
              e instanceof Error ? e.message : "Spotify player failed to start",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setPlayerInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
      setDeviceId(null);
    };
  }, [enabled, connected, getPlaybackAccessToken]);

  useEffect(() => {
    if (!enabled || !connected) return;
    void refreshPlaylists();
  }, [enabled, connected, refreshPlaylists]);

  const playPlaylist = useCallback(
    async (contextUri: string) => {
      if (!deviceId) {
        throw new Error("Player not ready yet — wait for device connection.");
      }
      await playbackAction({
        input: { command: "play", deviceId, contextUri },
      });
    },
    [deviceId, playbackAction],
  );

  const pause = useCallback(async () => {
    if (!deviceId) return;
    await playbackAction({ input: { command: "pause", deviceId } });
  }, [deviceId, playbackAction]);

  const resume = useCallback(async () => {
    if (!deviceId) return;
    await playbackAction({ input: { command: "resume", deviceId } });
  }, [deviceId, playbackAction]);

  const next = useCallback(async () => {
    if (!deviceId) return;
    await playbackAction({ input: { command: "next", deviceId } });
  }, [deviceId, playbackAction]);

  const previous = useCallback(async () => {
    if (!deviceId) return;
    await playbackAction({ input: { command: "previous", deviceId } });
  }, [deviceId, playbackAction]);

  const isPlaying = playerState ? !playerState.paused : false;
  const currentTrackName =
    playerState?.track_window?.current_track?.name ?? null;
  const currentArtistName =
    playerState?.track_window?.current_track?.artists
      ?.map((a) => a.name)
      .filter(Boolean)
      .join(", ") ?? null;

  return {
    connection,
    connected,
    beginLogin,
    disconnect,
    playlists,
    playlistsLoading,
    playlistsError,
    refreshPlaylists,
    playPlaylist,
    deviceId,
    sdkError,
    playerInitializing,
    pause,
    resume,
    next,
    previous,
    isPlaying,
    currentTrackName,
    currentArtistName,
  };
}
