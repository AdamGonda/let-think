import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTrackTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type SpotifyTransportProps = {
  disabled: boolean;
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  positionMs: number | null;
  durationMs: number | null;
  onPause: () => void;
  onResume: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (positionMs: number) => void;
};

export function SpotifyTransport({
  disabled,
  isPlaying,
  trackName,
  artistName,
  positionMs,
  durationMs,
  onPause,
  onResume,
  onPrevious,
  onNext,
  onSeek,
}: SpotifyTransportProps) {
  const [scrubMs, setScrubMs] = useState<number | null>(null);

  const hasTrack = Boolean(trackName);
  const duration = durationMs ?? 0;
  const livePosition = positionMs ?? 0;
  const shownMs = scrubMs ?? livePosition;
  const canSeek = hasTrack && duration > 0 && !disabled;
  const maxMs = Math.max(duration, 1);
  const sliderValue = Math.min(Math.max(0, shownMs), maxMs);

  return (
    <div className="flex flex-col gap-3 shrink-0 border border-zinc-800 rounded-xl p-4 bg-zinc-950/50">
      <div className="min-h-[2.5rem]">
        {trackName ? (
          <>
            <p className="text-sm font-medium text-zinc-100 truncate">
              {trackName}
            </p>
            {artistName ? (
              <p className="text-xs text-zinc-500 truncate">{artistName}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Nothing playing</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[11px] tabular-nums text-zinc-500">
          <span>{formatTrackTime(shownMs)}</span>
          <span>
            {duration > 0 ? formatTrackTime(duration) : "—:—"}
          </span>
        </div>
        <input
          type="range"
          aria-label="Playback position"
          className="w-full h-2 accent-zinc-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          min={0}
          max={maxMs}
          step={500}
          value={sliderValue}
          disabled={!canSeek}
          onPointerDown={() => {
            if (!canSeek) return;
            setScrubMs(livePosition);
          }}
          onInput={(e) => {
            if (!canSeek) return;
            setScrubMs(Number(e.currentTarget.value));
          }}
          onPointerUp={(e) => {
            if (!canSeek) return;
            const v = Number((e.target as HTMLInputElement).value);
            setScrubMs(null);
            onSeek(v);
          }}
          onPointerCancel={() => setScrubMs(null)}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous track"
          disabled={disabled}
          onClick={onPrevious}
        >
          <SkipBack className="size-4" />
        </Button>
        {isPlaying ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-11"
            aria-label="Pause"
            disabled={disabled}
            onClick={onPause}
          >
            <Pause className="size-5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-11"
            aria-label="Play"
            disabled={disabled}
            onClick={onResume}
          >
            <Play className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next track"
          disabled={disabled}
          onClick={onNext}
        >
          <SkipForward className="size-4" />
        </Button>
      </div>
    </div>
  );
}
