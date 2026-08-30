import { clsx } from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";

type NotesListSessionCardProps = {
  session: Doc<"sessions">;
  /** Matches the active session in the sidebar / graph. */
  isSelected: boolean;
  /** Session map dot is hovered for this session. */
  isMapHighlighted?: boolean;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
};

/**
 * Card for a file in the Explore drill grid — matches project folder cards;
 * “Open” appears on hover (always visible when hover is unavailable, e.g. touch).
 * The whole card also opens the file.
 */
export function NotesListSessionCard({
  session,
  isSelected,
  isMapHighlighted = false,
  onOpenNotesEditor,
}: NotesListSessionCardProps) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2 transition-[border-color,background-color] duration-150 cursor-pointer",
        isSelected ? "border-sidebar-primary" : "border-border/90",
        // Map hover: neutral surface tint (not session accent — avoids clashing with chart dots).
        isMapHighlighted && "bg-muted/45",
      )}
      onClick={() => onOpenNotesEditor(session)}
    >
      <CornerRippleBackdrop />
      <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5 text-left transition-colors group-hover:bg-muted/10">
        <span className="font-semibold text-foreground leading-snug line-clamp-2">
          {session.title}
        </span>
        <div
          className={clsx(
            "mt-auto flex flex-wrap items-center justify-start gap-1 pt-1",
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
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
