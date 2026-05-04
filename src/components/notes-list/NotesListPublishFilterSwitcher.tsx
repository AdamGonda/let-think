import { clsx } from "clsx";
import type { NotesListPublishFilter } from "@/machines/appUiTypes";

type NotesListPublishFilterSwitcherProps = {
  filter: NotesListPublishFilter;
  onFilterChange: (filter: NotesListPublishFilter) => void;
};

const OPTIONS: Array<{ value: NotesListPublishFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Public" },
  { value: "private", label: "Private" },
];

/**
 * Segmented control for filtering project / session cards by publish state (Files view).
 */
export function NotesListPublishFilterSwitcher({
  filter,
  onFilterChange,
}: NotesListPublishFilterSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Note visibility"
      className="inline-flex shrink-0 flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-card p-1 text-sm"
    >
      {OPTIONS.map((opt) => {
        const isActive = filter === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onFilterChange(opt.value);
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
