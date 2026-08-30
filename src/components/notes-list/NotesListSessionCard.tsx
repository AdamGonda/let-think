import { clsx } from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
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
 * Card for a file in the Explore drill grid — matches project folder cards.
 * The whole card is one button; “Open” is the hover/touch affordance.
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
        "group relative overflow-hidden rounded-xl border-2 transition-[border-color,background-color] duration-150",
        isSelected ? "border-sidebar-primary" : "border-border/90",
        // Map hover: neutral surface tint (not session accent — avoids clashing with chart dots).
        isMapHighlighted && "bg-muted/45",
      )}
    >
      <CornerRippleBackdrop />
      <button
        type="button"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onOpenNotesEditor(session)}
        className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="font-semibold text-foreground leading-snug line-clamp-2">
          {session.title}
        </span>
        <span
          className={clsx(
            "mt-auto inline-flex h-7 w-fit items-center px-2 text-sm font-normal text-muted-foreground/90",
            "opacity-0 transition-opacity duration-200 ease-out",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "[@media(hover:none)]:opacity-100",
          )}
        >
          Open
        </span>
      </button>
    </div>
  );
}
