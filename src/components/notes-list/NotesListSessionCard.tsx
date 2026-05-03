import type { MouseEvent } from "react";
import { clsx } from "clsx";
import { Globe, Lock, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import { useAppUiActor } from "@/hooks/useAppUi";
import { openPublishConfirm } from "@/lib/appUiCommands";
import type { SessionWithPublish } from "@/components/session-sidebar/workspaceTypes";

type NotesListSessionCardProps = {
  session: SessionWithPublish;
  /** Matches the active session in the sidebar / graph. */
  isSelected: boolean;
  onOpenNotesEditor: (session: SessionWithPublish) => void;
  onOpenSessionGraph: (session: SessionWithPublish) => void;
};

/**
 * Card for a session in the Files drill grid — matches project folder cards.
 * To notes / To session sit bottom-left and only show on card hover (or touch / when that strip has focus).
 * Public toggle is top-right, hover-only the same way.
 */
export function NotesListSessionCard({
  session,
  isSelected,
  onOpenNotesEditor,
  onOpenSessionGraph,
}: NotesListSessionCardProps) {
  const actor = useAppUiActor();
  const isPublished = session.isPublished;

  const openPublishFlow = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    openPublishConfirm(actor, {
      sessionId: session._id,
      intent: isPublished ? "unpublish" : "publish",
      sessionTitle: session.title,
    });
  };

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2",
        isSelected ? "border-sidebar-primary" : "border-border/90",
      )}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-30 w-full flex-col p-5 text-left transition-colors group-hover:bg-muted/10">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <span className="min-w-0 flex-1 font-semibold text-foreground leading-snug line-clamp-2">
            {session.title}
          </span>
          <button
            type="button"
            onClick={openPublishFlow}
            title={isPublished ? "Unpublish from Discover" : "Publish to Discover"}
            aria-label={
              isPublished
                ? "Public on Discover — unpublish"
                : "Private — publish to Discover"
            }
            className={clsx(
              "group/badge grid min-h-7 min-w-[6.75rem] shrink-0 cursor-pointer place-items-center rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 transition-opacity duration-200 ease-out",
              "text-muted-foreground hover:border-border hover:bg-muted/45 hover:text-foreground",
              "opacity-0 pointer-events-none",
              "group-hover:opacity-100 group-hover:pointer-events-auto",
              "focus-visible:opacity-100 focus-visible:pointer-events-auto",
              "[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            <span
              className={clsx(
                "col-start-1 row-start-1 pointer-events-none flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide transition-opacity duration-150",
                !isPublished
                  ? "opacity-100 group-hover/badge:opacity-0 [@media(hover:none)]:opacity-0"
                  : "opacity-0",
              )}
            >
              <Lock className="size-3 shrink-0" aria-hidden />
              Private
            </span>
            <span
              className={clsx(
                "col-start-1 row-start-1 pointer-events-none flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide transition-opacity duration-150",
                isPublished
                  ? "opacity-100 group-hover/badge:opacity-0 [@media(hover:none)]:opacity-0"
                  : "opacity-0",
              )}
            >
              <Globe className="size-3 shrink-0" aria-hidden />
              Public
            </span>
            <span
              className={clsx(
                "col-start-1 row-start-1 pointer-events-none flex items-center justify-center gap-1 px-1 text-xs font-medium transition-opacity duration-150",
                !isPublished
                  ? "opacity-0 group-hover/badge:opacity-100 [@media(hover:none)]:opacity-100"
                  : "opacity-0",
              )}
            >
              <Globe className="size-3 shrink-0" aria-hidden />
              Publish
            </span>
            <span
              className={clsx(
                "col-start-1 row-start-1 pointer-events-none flex items-center justify-center gap-1 px-1 text-xs font-medium transition-opacity duration-150",
                isPublished
                  ? "opacity-0 group-hover/badge:opacity-100 [@media(hover:none)]:opacity-100"
                  : "opacity-0",
              )}
            >
              <Unplug className="size-3 shrink-0" aria-hidden />
              Unpublish
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div
          className={clsx(
            "absolute bottom-5 left-5 z-10 flex flex-wrap items-center gap-1",
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
        </div>
      </div>
    </div>
  );
}
