import { Button } from "@/components/ui/button";
import type { SpotifyPlaylistSummary } from "@/lib/spotifyClient";

type SpotifyPlaylistListProps = {
  playlists: SpotifyPlaylistSummary[];
  loading: boolean;
  error: string | null;
  /** Spotify `spotify:playlist:…` URI for the context currently playing, from Web Playback state. */
  activePlaylistUri: string | null;
  onSelect: (playlist: SpotifyPlaylistSummary) => void;
  onRefresh: () => void;
};

export function SpotifyPlaylistList({
  playlists,
  loading,
  error,
  activePlaylistUri,
  onSelect,
  onRefresh,
}: SpotifyPlaylistListProps) {
  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h3 className="text-sm font-medium text-zinc-200">Your playlists</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-zinc-400"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-400/90">{error}</p>
      ) : null}
      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1 px-0.5 py-0.5">
        {loading && playlists.length === 0 ? (
          <li className="text-sm text-zinc-500 py-4">Loading playlists…</li>
        ) : null}
        {playlists.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-current={p.uri === activePlaylistUri ? "true" : undefined}
              className={`w-full cursor-pointer text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                p.uri === activePlaylistUri
                  ? "bg-zinc-700/90 text-zinc-50 ring-1 ring-inset ring-zinc-500/60"
                  : "text-zinc-200 hover:bg-zinc-800/80"
              }`}
              onClick={() => onSelect(p)}
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="size-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="size-10 rounded bg-zinc-800 shrink-0" />
              )}
              <span className="truncate">{p.name}</span>
            </button>
          </li>
        ))}
        {!loading && playlists.length === 0 && !error ? (
          <li className="text-sm text-zinc-500 py-4">No playlists found.</li>
        ) : null}
      </ul>
    </div>
  );
}
