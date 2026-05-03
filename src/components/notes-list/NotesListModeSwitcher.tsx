import { clsx } from "clsx";
import type { NotesListMode } from "@/machines/appUiTypes";

type NotesListModeSwitcherProps = {
  mode: NotesListMode;
  onModeChange: (mode: NotesListMode) => void;
};

const OPTIONS: Array<{ value: NotesListMode; label: string }> = [
  { value: "mine", label: "Mine" },
  { value: "discover", label: "Discover" },
];

/**
 * Segmented control at the top of the Files / Explore view that switches
 * between the user's own projects ("mine") and the global feed of published
 * notes ("discover"). Hidden by callers while drilled into a folder.
 */
export function NotesListModeSwitcher({
  mode,
  onModeChange,
}: NotesListModeSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Files mode"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-card p-1 text-sm"
    >
      {OPTIONS.map((opt) => {
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onModeChange(opt.value);
            }}
            className={clsx(
              "cursor-pointer rounded-md px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-muted/40 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
