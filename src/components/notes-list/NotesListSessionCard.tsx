import { clsx } from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { formatUpdatedLabel } from "@/lib/notesListUtils";

type NotesListSessionCardProps = {
  session: Doc<"sessions">;
  /** Matches the active session in the sidebar / graph. */
  isSelected: boolean;
  onSelect: (session: Doc<"sessions">) => void;
};

/**
 * Presentational card for a session row in the notes list drill view.
 */
export function NotesListSessionCard({
  session,
  isSelected,
  onSelect,
}: NotesListSessionCardProps) {
  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(session)}
      className={clsx(
        "flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-xl border-2 bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected
          ? "border-sidebar-primary hover:border-sidebar-primary"
          : "border-border/90 hover:border-border/90",
      )}
    >
      <span className="font-semibold text-foreground leading-snug line-clamp-2">
        {session.title}
      </span>
      <p className="text-xs text-muted-foreground/90 pt-1">
        {formatUpdatedLabel(session.createdAt)}
      </p>
    </button>
  );
}
