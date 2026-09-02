import { Search, ChevronLeft, Plus, FolderPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCard } from "@/components/user/UserCard";
import { cn } from "@/lib/utils";

type NotesListToolbarProps = {
  drilled: boolean;
  hasDrillGroup: boolean;
  drillHeading: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onBackFromDrill: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRunTutorial?: () => void;
  className?: string;
};

export function NotesListToolbar({
  drilled,
  hasDrillGroup,
  drillHeading,
  searchQuery,
  onSearchQueryChange,
  onBackFromDrill,
  onNewFile,
  onNewFolder,
  onRunTutorial,
  className,
}: NotesListToolbarProps) {
  return (
    <div className={cn("shrink-0 py-6", className)}>
      <div className="mb-5 flex min-h-9 items-center gap-3">
        {drilled && hasDrillGroup ? (
          <button
            type="button"
            onClick={onBackFromDrill}
            className="flex size-9 shrink-0 items-center justify-center cursor-pointer rounded-lg border border-border/80 bg-card text-foreground transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to files"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground truncate">
          {drillHeading}
        </h1>
        <Button
          variant="secondary"
          className="h-9 gap-2 px-3 ring-1 ring-border/50 shadow-sm"
          onClick={onNewFile}
          aria-label="New file"
          data-tour="new-session"
        >
          <Plus className="size-4 stroke-[1.75]" />
          New file
        </Button>
        {!drilled ? (
          <Button
            variant="ghost"
            className="h-9 gap-2 px-3 ring-1 ring-border/50 shadow-sm"
            onClick={onNewFolder}
            aria-label="New space"
            data-tour="new-project"
          >
            <FolderPlus className="size-4 stroke-[1.75]" />
            New space
          </Button>
        ) : null}
        <div className="relative z-20 shrink-0">
          <UserCard onRunTutorial={onRunTutorial} />
        </div>
      </div>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by title…"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-10 w-full pl-9 rounded-lg bg-muted/25 border-border/80 focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
    </div>
  );
}
