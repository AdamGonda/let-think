import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSpotifyController } from "@/hooks/useSpotifyController";
import { SpotifyPlaylistList } from "./SpotifyPlaylistList";
import { SpotifyTransport } from "./SpotifyTransport";
import type { SpotifyPlaylistSummary } from "@/lib/spotifyClient";
import {
  consumeStoredSpotifyOAuthErrorMessage,
  getSpotifyRuntimeErrorMessage,
} from "@/lib/spotifyAuth";

type SpotifyPanelProps = {
  /** When false, tear down the Web Playback SDK player to save resources. */
  active: boolean;
};

export function SpotifyPanel({ active }: SpotifyPanelProps) {
  const {
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
  } = useSpotifyController(active);

  const [actionLoading, setActionLoading] = useState(false);
  const [oauthErrorMessage, setOauthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOauthErrorMessage(consumeStoredSpotifyOAuthErrorMessage());
  }, []);

  const onSelectPlaylist = useCallback(
    async (playlist: SpotifyPlaylistSummary) => {
      setActionLoading(true);
      try {
        await playPlaylist(playlist.uri);
        toast.success(`Playing “${playlist.name}”`);
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Could not start playback";
        toast.error(
          getSpotifyRuntimeErrorMessage(raw),
        );
      } finally {
        setActionLoading(false);
      }
    },
    [playPlaylist],
  );

  const onResetConnection = useCallback(async () => {
    try {
      const result = await disconnect();
      if (!result.removedConnection && result.removedOauthStates === 0) {
        toast.message("Spotify reset complete (nothing to clear).");
        return;
      }
      toast.success(
        `Spotify reset complete (${result.removedConnection ? "connection removed" : "no connection"}; ${result.removedOauthStates} OAuth state ${result.removedOauthStates === 1 ? "row" : "rows"} cleared).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset Spotify");
    }
  }, [disconnect]);

  const onDisconnect = useCallback(async () => {
    try {
      const result = await disconnect();
      if (!result.removedConnection && result.removedOauthStates === 0) {
        toast.message("Spotify already disconnected.");
        return;
      }
      toast.success("Spotify disconnected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect Spotify");
    }
  }, [disconnect]);

  const transportDisabled =
    !deviceId ||
    playerInitializing ||
    Boolean(sdkError) ||
    actionLoading;

  if (connection === undefined) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-6">
        <p className="text-zinc-500 text-sm">Loading Spotify…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-6 text-center">
        {oauthErrorMessage ? (
          <p className="text-amber-300 text-sm max-w-md" role="alert">
            {oauthErrorMessage}
          </p>
        ) : null}
        <p className="text-zinc-300 text-sm max-w-md">
          Connect your Spotify account to browse playlists and control playback
          in the browser (Spotify Premium required for Web Playback).
        </p>
        <Button type="button" onClick={() => void beginLogin()}>
          Connect Spotify
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-zinc-500"
          onClick={() => void onResetConnection()}
        >
          Reset Spotify connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 min-w-0">
      {sdkError ? (
        <p className="text-sm text-amber-400/95 shrink-0" role="alert">
          {sdkError}
        </p>
      ) : null}
      {playerInitializing ? (
        <p className="text-xs text-zinc-500 shrink-0">
          Starting Spotify in-browser player…
        </p>
      ) : deviceId ? (
        <p className="text-xs text-zinc-600 shrink-0 tabular-nums">
          Device ready
        </p>
      ) : (
        <p className="text-xs text-zinc-500 shrink-0">
          Waiting for Spotify device…
        </p>
      )}

      <SpotifyTransport
        disabled={transportDisabled}
        isPlaying={isPlaying}
        trackName={currentTrackName}
        artistName={currentArtistName}
        onPause={() => void pause()}
        onResume={() => void resume()}
        onPrevious={() => void previous()}
        onNext={() => void next()}
      />

      <SpotifyPlaylistList
        playlists={playlists}
        loading={playlistsLoading}
        error={playlistsError}
        onSelect={onSelectPlaylist}
        onRefresh={() => void refreshPlaylists()}
      />

      <div className="shrink-0 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-zinc-500"
          onClick={() => void onDisconnect()}
        >
          Disconnect Spotify
        </Button>
      </div>
    </div>
  );
}
