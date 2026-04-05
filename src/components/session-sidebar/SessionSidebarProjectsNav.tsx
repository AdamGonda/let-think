import { ChevronDown } from "lucide-react";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "./workspaceTypes";
import { SidebarProjectGroup } from "./SidebarProjectGroup";
import { SidebarSessionItem } from "./SidebarSessionItem";
import type { SessionSidebarWorkspaceModel } from "./useSessionSidebarWorkspace";

type SessionSidebarProjectsNavProps = {
  model: SessionSidebarWorkspaceModel;
  isCollapsed: boolean;
  viewModeIsNotesList: boolean;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
};

export function SessionSidebarProjectsNav({
  model,
  isCollapsed,
  viewModeIsNotesList,
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
}: SessionSidebarProjectsNavProps) {
  const {
    data,
    allSessions,
    projectsSectionOpen,
    setProjectsSectionOpen,
    expandedProjectIds,
    dragOverProjectId,
    setDragOverProjectId,
    editingSessionId,
    setEditingSessionId,
    editingProjectId,
    setEditingProjectId,
    confirmDeleteSessionId,
    setConfirmDeleteSessionId,
    confirmDeleteProjectId,
    setConfirmDeleteProjectId,
    sessionInputRef,
    projectInputRef,
    projectClickTimeoutRef,
    handleNewSession,
    toggleProjectExpanded,
    handleRename,
    handleRenameProject,
    handleDelete,
    handleMoveSession,
    handleDeleteProject,
  } = model;

  return (
    <nav
      className={`flex-1 overflow-y-auto py-3 flex flex-col gap-3 ${
        isCollapsed ? "hidden" : "px-3"
      }`}
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setProjectsSectionOpen((o) => !o)}
          aria-expanded={projectsSectionOpen}
          aria-controls="sidebar-projects-list"
          aria-label={
            projectsSectionOpen
              ? "Collapse projects list"
              : "Expand projects list"
          }
          className="flex cursor-pointer items-center gap-1 w-full min-w-0 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90 px-2 py-1 rounded-lg hover:bg-muted/15 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
              projectsSectionOpen ? "" : "-rotate-90"
            }`}
            aria-hidden
          />
          Projects
        </button>
        {projectsSectionOpen && (
          <div id="sidebar-projects-list" className="flex flex-col gap-2">
            {data
              ?.filter((g: ProjectWithSessions) => g.project)
              .map((group: ProjectWithSessions) => {
                const project = group.project!;
                const projectId = project._id;
                const isExpanded = expandedProjectIds.has(projectId);
                return (
                  <SidebarProjectGroup
                    key={projectId}
                    group={group}
                    isExpanded={isExpanded}
                    viewModeIsNotesList={viewModeIsNotesList}
                    activeProjectId={activeProjectId}
                    activeSessionId={activeSessionId}
                    dragOverProjectId={dragOverProjectId}
                    editingProjectId={editingProjectId}
                    editingSessionId={editingSessionId}
                    projectInputRef={projectInputRef}
                    sessionInputRef={sessionInputRef}
                    confirmDeleteProjectId={confirmDeleteProjectId}
                    confirmDeleteSessionId={confirmDeleteSessionId}
                    projectClickTimeoutRef={projectClickTimeoutRef}
                    allSessionsLength={allSessions.length}
                    onDragOverProject={(id) => setDragOverProjectId(id)}
                    onDragLeaveProject={() => setDragOverProjectId(null)}
                    onDropOnProject={(projectIdDrop, e) => {
                      e.preventDefault();
                      const sessionId = e.dataTransfer.getData(
                        "text/plain",
                      ) as Id<"sessions">;
                      if (sessionId) {
                        handleMoveSession(sessionId, projectIdDrop);
                      }
                      setDragOverProjectId(null);
                    }}
                    onRenameProject={handleRenameProject}
                    onCancelEditProject={() => setEditingProjectId(null)}
                    onToggleProjectExpanded={toggleProjectExpanded}
                    onStartEditProject={setEditingProjectId}
                    onNewSessionInProject={(e, pid) => {
                      e.stopPropagation();
                      handleNewSession(pid);
                    }}
                    onRequestDeleteProject={(e, id) => {
                      e.stopPropagation();
                      setConfirmDeleteProjectId(id);
                    }}
                    onConfirmDeleteProject={(e, id) => {
                      e.stopPropagation();
                      handleDeleteProject(id);
                    }}
                    onCancelDeleteProject={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteProjectId(null);
                    }}
                    onMouseLeaveDeleteProjectConfirm={() =>
                      setConfirmDeleteProjectId(null)
                    }
                    onSelectSession={(id) => onSelectSession(id)}
                    onSelectProject={onSelectProject}
                    onRenameSession={handleRename}
                    onCancelEditSession={() => setEditingSessionId(null)}
                    onSetEditingSessionId={setEditingSessionId}
                    onSetConfirmDeleteSessionId={setConfirmDeleteSessionId}
                    onRequestDeleteSession={(e, id) => {
                      e.stopPropagation();
                      setConfirmDeleteSessionId(id);
                    }}
                    onCancelDeleteSession={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteSessionId(null);
                    }}
                    onDeleteSession={handleDelete}
                  />
                );
              })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div
          className={`flex items-center gap-1 rounded-lg border transition-colors py-1.5 px-0 border-transparent ${
            dragOverProjectId === "inbox" ? "ring-2 ring-ring ring-inset" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverProjectId("inbox");
          }}
          onDragLeave={() => setDragOverProjectId(null)}
          onDrop={(e) => {
            e.preventDefault();
            const sessionId = e.dataTransfer.getData(
              "text/plain",
            ) as Id<"sessions">;
            if (sessionId) {
              handleMoveSession(sessionId, null);
            }
            setDragOverProjectId(null);
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90 py-1 px-2">
            Sessions
          </span>
        </div>
        {(data?.find((g: ProjectWithSessions) => !g.project)?.sessions ?? []).map(
          (session: Doc<"sessions">) => (
            <SidebarSessionItem
              key={session._id}
              session={session}
              isGraphActive={
                !viewModeIsNotesList && activeSessionId === session._id
              }
              viewModeIsNotesList={viewModeIsNotesList}
              editingSessionId={editingSessionId}
              sessionInputRef={sessionInputRef}
              confirmDeleteSessionId={confirmDeleteSessionId}
              canDeleteSession={allSessions.length > 1}
              onSelect={() => {
                if (editingSessionId !== session._id) {
                  onSelectSession(session._id);
                  onSelectProject(null);
                }
              }}
              onBeginEdit={(e) => {
                if (editingSessionId !== session._id) {
                  e.stopPropagation();
                  setEditingSessionId(session._id);
                }
              }}
              onRename={handleRename}
              onCancelEdit={() => setEditingSessionId(null)}
              onRequestDelete={(e) => {
                e.stopPropagation();
                setConfirmDeleteSessionId(session._id);
              }}
              onConfirmDelete={(e) => {
                e.stopPropagation();
                handleDelete(session._id);
              }}
              onCancelDelete={(e) => {
                e.stopPropagation();
                setConfirmDeleteSessionId(null);
              }}
              onMouseLeaveDeleteConfirm={() => setConfirmDeleteSessionId(null)}
            />
          ),
        )}
      </div>
    </nav>
  );
}
