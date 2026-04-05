import { forwardRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { UserCard } from "./UserCard";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
} from "@/lib/sidebarStorage";
import type {
  ProjectWithSessions,
  SessionSidebarHandle,
} from "./session-sidebar/workspaceTypes";
import { useSessionSidebarWorkspace } from "./session-sidebar/useSessionSidebarWorkspace";
import { SessionSidebarToolbar } from "./session-sidebar/SessionSidebarToolbar";
import { SessionSidebarProjectsNav } from "./session-sidebar/SessionSidebarProjectsNav";

export type { ProjectWithSessions, SessionSidebarHandle };

interface SessionSidebarProps {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
  viewMode: "graph" | "notesList";
  onViewModeChange: (mode: "graph" | "notesList") => void;
  onRunTutorial?: () => void;
}

export const SessionSidebar = forwardRef<
  SessionSidebarHandle,
  SessionSidebarProps
>(function SessionSidebar(
  {
    workspace,
    activeSessionId,
    activeProjectId,
    onSelectSession,
    onSelectProject,
    viewMode,
    onViewModeChange,
    onRunTutorial,
  },
  ref,
) {
  const w = useSessionSidebarWorkspace({
    workspace,
    activeSessionId,
    activeProjectId,
    onSelectSession,
    onSelectProject,
    imperativeRef: ref,
  });

  const viewModeIsNotesList = viewMode === "notesList";

  return (
    <aside
      className="shrink-0 flex flex-col h-screen overflow-hidden bg-muted/30 border-r border-border transition-[width] duration-200 ease-in-out"
      style={{
        width: w.isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      }}
    >
      <SessionSidebarToolbar
        isCollapsed={w.isCollapsed}
        onToggleCollapsed={() => w.setIsCollapsed((c) => !c)}
        onNewSession={() => void w.handleNewSession()}
        onNewProject={() => void w.handleNewProject()}
        viewModeIsNotesList={viewModeIsNotesList}
        onViewModeChange={onViewModeChange}
      />
      <SessionSidebarProjectsNav
        model={w}
        isCollapsed={w.isCollapsed}
        viewModeIsNotesList={viewModeIsNotesList}
        activeSessionId={activeSessionId}
        activeProjectId={activeProjectId}
        onSelectSession={onSelectSession}
        onSelectProject={onSelectProject}
      />
      <div
        className={`flex flex-col gap-2 border-t border-border transition-[padding] duration-200 shrink-0 ${
          w.isCollapsed ? "p-2 items-center mt-auto" : "px-3 pt-3 pb-1.5"
        }`}
      >
        <UserCard
          compact={w.isCollapsed}
          menuDisabled={w.isCollapsed}
          onExpandSidebar={() => w.setIsCollapsed(false)}
          onRunTutorial={onRunTutorial}
        />
      </div>
    </aside>
  );
});

SessionSidebar.displayName = "SessionSidebar";
