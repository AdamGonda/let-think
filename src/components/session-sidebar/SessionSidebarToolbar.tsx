import {
  Plus,
  FolderPlus,
  PanelLeftClose,
  PanelRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionSidebarToolbarProps = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onNewSession: () => void;
  onNewProject: () => void;
  viewModeIsNotesList: boolean;
  onViewModeChange: (mode: "graph" | "notesList") => void;
};

export function SessionSidebarToolbar({
  isCollapsed,
  onToggleCollapsed,
  onNewSession,
  onNewProject,
  viewModeIsNotesList,
  onViewModeChange,
}: SessionSidebarToolbarProps) {
  return (
    <div
      className={`flex flex-col gap-1 min-w-0 transition-opacity duration-150 shrink-0 ${
        isCollapsed ? "m-2 items-center" : "m-3"
      }`}
    >
      <div
        className={`flex items-center gap-2 shrink-0 mb-2 ${
          isCollapsed ? "justify-center" : "w-full"
        }`}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-9 w-9 shrink-0"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelRight className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        {!isCollapsed && (
          <>
            <span className="font-brand text-[11px] font-semibold uppercase tracking-[0.05em] text-sidebar-foreground flex-1 text-center">
              LET THINK
            </span>
            <div className="w-9 shrink-0" aria-hidden />
          </>
        )}
      </div>
      <Button
        variant="secondary"
        className={
          isCollapsed
            ? "h-10 w-10 p-0 justify-center ring-1 ring-border/50 shadow-sm"
            : "justify-start h-10 w-full gap-2 px-3 ring-1 ring-border/50 shadow-sm"
        }
        onClick={onNewSession}
        aria-label="New session"
        data-tour="new-session"
      >
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center"
          aria-hidden
        >
          <Plus className="size-4.5 stroke-[1.75]" />
        </span>
        {!isCollapsed && "New session"}
      </Button>
      <Button
        variant="ghost"
        className={
          isCollapsed
            ? "h-10 w-10 p-0 justify-center ring-1 ring-border/50 shadow-sm"
            : "justify-start h-10 w-full gap-2 px-3 ring-1 ring-border/50 shadow-sm"
        }
        onClick={onNewProject}
        aria-label="New project"
        data-tour="new-project"
      >
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center"
          aria-hidden
        >
          <FolderPlus className="size-4.5 stroke-[1.75]" />
        </span>
        {!isCollapsed && "New project"}
      </Button>
      <Button
        variant="ghost"
        className={`transition-colors ${
          isCollapsed
            ? "h-10 w-10 p-0 justify-center rounded-lg overflow-hidden"
            : "justify-start h-10 w-full gap-2 px-3 rounded-none rounded-r-lg border-y border-r border-transparent"
        } ${
          viewModeIsNotesList && !isCollapsed
            ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
            : isCollapsed
              ? viewModeIsNotesList
                ? "hover:bg-muted/10 active:bg-muted/20"
                : "border-l-2 border-l-transparent hover:border-border hover:bg-muted/10 active:bg-muted/20"
              : "border-l-2 border-l-transparent hover:border-border hover:bg-muted/10 active:bg-muted/20"
        }`}
        onClick={() =>
          onViewModeChange(viewModeIsNotesList ? "graph" : "notesList")
        }
        aria-label={
          viewModeIsNotesList ? "Switch to graph view" : "Switch to projects list"
        }
        aria-pressed={viewModeIsNotesList}
        data-tour="notes-toggle"
      >
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center"
          aria-hidden
        >
          <Layers className="size-4.5 stroke-[1.75]" />
        </span>
        {!isCollapsed && "Projects"}
      </Button>
    </div>
  );
}
