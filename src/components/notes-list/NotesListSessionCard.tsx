import { clsx } from "clsx";
import { Globe } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import { formatUpdatedLabel } from "@/lib/notesListUtils";
import { usePublishStatus } from "@/hooks/usePublishStatus";

type NotesListSessionCardProps = {
  session: Doc<"sessions">;
  /** Matches the active session in the sidebar / graph. */
  isSelected: boolean;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
  onOpenSessionGraph: (session: Doc<"sessions">) => void;
};

/**
 * Card for a session in the Files drill grid — matches project folder cards;
 * “To notes” / “To session” actions appear on hover (always visible when hover is unavailable, e.g. touch).
 */
export function NotesListSessionCard({
  session,
  isSelected,
  onOpenNotesEditor,
  onOpenSessionGraph,
}: NotesListSessionCardProps) {
  const { isPublished, togglePublish } = usePublishStatus(session._id);
  const publishLabel =
    isPublished == null
      ? "Publish"
      : isPublished
        ? "Unpublish"
        : "Publish";

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2",
        isSelected ? "border-sidebar-primary" : "border-border/90",
      )}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5 text-left transition-colors group-hover:bg-muted/10">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0">
            {session.title}
          </span>
          {isPublished ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title="This note is published in Discover"
            >
              <Globe className="size-3" aria-hidden />
              Published
            </span>
          ) : null}
        </div>
        <p className="mt-auto text-xs text-muted-foreground/90 pt-1">
          {formatUpdatedLabel(session.createdAt)}
        </p>
      </div>
      <div
        className={clsx(
          "absolute bottom-1.5 right-1.5 z-20 flex flex-wrap items-center justify-end gap-1",
          "opacity-0 pointer-events-none transition-opacity duration-200 ease-out",
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          "focus-within:opacity-100 focus-within:pointer-events-auto",
          "[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 shrink-0 px-2 font-normal text-muted-foreground/90 hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotesEditor(session);
          }}
        >
          To notes
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 shrink-0 px-2 font-normal text-muted-foreground/90 hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSessionGraph(session);
          }}
        >
          To session
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isPublished == null}
          className="h-7 shrink-0 px-2 font-normal text-muted-foreground/90 hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            void togglePublish();
          }}
          aria-pressed={isPublished === true}
        >
          {publishLabel}
        </Button>
      </div>
    </div>
  );
}
