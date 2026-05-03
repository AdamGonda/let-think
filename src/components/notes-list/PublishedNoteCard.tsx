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
 * Card representing one entry in the Discover feed of published notes.
 * Clicking the card opens the read-only viewer dialog.
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
        "group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 border-border/90 text-left",
        "transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5 transition-colors group-hover:bg-muted/10">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0">
            {title || "Untitled note"}
          </span>
          {isMine ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="You published this note"
            >
              <Globe className="size-3" aria-hidden />
              Yours
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground/90">
          <span className="truncate">By {publisherName}</span>
          <span className="shrink-0">{formatPublishedLabel(publishedAt)}</span>
        </div>
      </div>
    </button>
  );
}
