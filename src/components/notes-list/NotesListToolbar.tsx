import type { ReactNode } from "react";
import { Search, ChevronLeft, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SortMode } from "@/lib/notesListUtils";
import type { NotesListPublishFilter } from "@/machines/appUiTypes";
import { NotesListPublishFilterSwitcher } from "./NotesListPublishFilterSwitcher";

type NotesListToolbarProps = {
  drilled: boolean;
  hasDrillGroup: boolean;
  drillHeading: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  publishFilter: NotesListPublishFilter;
  onPublishFilterChange: (filter: NotesListPublishFilter) => void;
  onBackFromDrill: () => void;
  /** Slot rendered to the right of the heading (e.g. Mine/Discover switcher). */
  modeSwitcher?: ReactNode;
};

export function NotesListToolbar({
  drilled,
  hasDrillGroup,
  drillHeading,
  searchQuery,
  onSearchQueryChange,
  sortMode,
  onSortModeChange,
  publishFilter,
  onPublishFilterChange,
  onBackFromDrill,
  modeSwitcher,
}: NotesListToolbarProps) {
  return (
    <div className="shrink-0 border-b border-border py-6">
      <div
        className={`mb-5 flex min-h-10 items-center ${
          drilled && hasDrillGroup ? "gap-6" : "gap-4"
        }`}
      >
        {drilled && hasDrillGroup ? (
          <button
            type="button"
            onClick={onBackFromDrill}
            className="shrink-0 cursor-pointer rounded-lg border border-border/80 bg-card p-2 text-foreground transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to projects"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground truncate">
          {drillHeading}
        </h1>
        {modeSwitcher}
      </div>
      <div className="relative mb-3 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder={drilled ? "Search sessions…" : "Search projects…"}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-10 w-full pl-9 rounded-lg bg-muted/25 border-border/80 focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">
        <NotesListPublishFilterSwitcher
          filter={publishFilter}
          onFilterChange={onPublishFilterChange}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
          <span className="sr-only">Sort</span>
          <span className="hidden sm:inline">Sort by</span>
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => onSortModeChange(e.target.value as SortMode)}
              className="appearance-none cursor-pointer rounded-lg border border-border/80 bg-card py-1.5 pl-3 pr-8 text-sm text-foreground transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="activity">Last changed</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </label>
      </div>
    </div>
  );
}
