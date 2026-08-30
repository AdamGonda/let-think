import { Search, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NotesListToolbarProps = {
  drilled: boolean;
  hasDrillGroup: boolean;
  drillHeading: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onBackFromDrill: () => void;
  /** Merged onto the root wrapper (e.g. split-layout padding). */
  className?: string;
};

export function NotesListToolbar({
  drilled,
  hasDrillGroup,
  drillHeading,
  searchQuery,
  onSearchQueryChange,
  onBackFromDrill,
  className,
}: NotesListToolbarProps) {
  return (
    <div
      className={cn("shrink-0 border-b border-border py-6", className)}
    >
      <div
        className={`mb-5 flex min-h-10 items-center ${
          drilled && hasDrillGroup ? "gap-6" : ""
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
      </div>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder={drilled ? "Search files…" : "Search projects…"}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-10 w-full pl-9 rounded-lg bg-muted/25 border-border/80 focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
    </div>
  );
}
