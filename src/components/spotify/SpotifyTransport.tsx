import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

type SpotifyTransportProps = {
  disabled: boolean;
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  onPause: () => void;
  onResume: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function SpotifyTransport({
  disabled,
  isPlaying,
  trackName,
  artistName,
  onPause,
  onResume,
  onPrevious,
  onNext,
}: SpotifyTransportProps) {
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
