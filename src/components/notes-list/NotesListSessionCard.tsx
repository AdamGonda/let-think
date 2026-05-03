import { clsx } from "clsx";
import { FileText, MessageSquare } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import { formatUpdatedLabel } from "@/lib/notesListUtils";

type NotesListSessionCardProps = {
  session: Doc<"sessions">;
  /** Matches the active session in the sidebar / graph. */
  isSelected: boolean;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
  onOpenSessionGraph: (session: Doc<"sessions">) => void;
};

/**
 * Card for a session in the Files drill grid — matches project folder cards;
 * notes vs session actions appear on hover (always visible when hover is unavailable, e.g. touch).
 */
export function NotesListSessionCard({
  session,
  isSelected,
  onOpenNotesEditor,
  onOpenSessionGraph,
}: NotesListSessionCardProps) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2",
        isSelected ? "border-sidebar-primary" : "border-border/90",
      )}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5 text-left transition-colors group-hover:bg-muted/10">
        <span className="font-semibold text-foreground leading-snug line-clamp-2">
          {session.title}
        </span>
        <p className="mt-auto text-xs text-muted-foreground/90 pt-1">
          {formatUpdatedLabel(session.createdAt)}
        </p>
      </div>
      <div
        className={clsx(
          "absolute bottom-2 right-2 z-20 flex items-center gap-0.5",
          "opacity-0 pointer-events-none transition-opacity duration-200 ease-out",
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          "focus-within:opacity-100 focus-within:pointer-events-auto",
          "[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-7 w-7 shrink-0 text-muted-foreground/85 hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotesEditor(session);
          }}
          aria-label="Open notes"
        >
          <FileText className="size-3.5 stroke-[1.5]" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-7 w-7 shrink-0 text-muted-foreground/85 hover:bg-muted/50 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSessionGraph(session);
          }}
          aria-label="Open session"
        >
          <MessageSquare className="size-3.5 stroke-[1.5]" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
