import { clsx } from "clsx";
import { Globe } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";

type PublishedNoteCardProps = {
  sessionId: Id<"sessions">;
  title: string;
  publisherName: string;
  publishedAt: number;
  isMine: boolean;
  onOpen: (sessionId: Id<"sessions">) => void;
};

function formatPublishedLabel(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(diff / 86400_000);
  if (minutes < 1) return "Published just now";
  if (minutes < 60) return `Published ${minutes}m ago`;
  if (hours < 24) return `Published ${hours}h ago`;
  if (days < 7) return `Published ${days}d ago`;
  return `Published ${new Date(ms).toLocaleDateString()}`;
}

/**
 * Discover feed teaser — layout and density differ from folder/project cards
 * in Mine. Opens the read-only published viewer on click.
 */
export function PublishedNoteCard({
  sessionId,
  title,
  publisherName,
  publishedAt,
  isMine,
  onOpen,
}: PublishedNoteCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(sessionId)}
      className={clsx(
        "group relative flex min-h-[8.5rem] w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border/70 bg-card/40 text-left shadow-sm",
        "transition-[border-color,box-shadow,background-color] hover:border-border hover:bg-muted/15 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-[inherit] w-full flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-3 sm:text-lg sm:leading-snug">
            {title || "Untitled note"}
          </span>
          {isMine ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="You published this note"
            >
              <Globe className="size-3" aria-hidden />
              Yours
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground sm:text-xs">
          <span className="min-w-0 truncate font-medium text-muted-foreground/95">
            By {publisherName}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground/80">
            {formatPublishedLabel(publishedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
