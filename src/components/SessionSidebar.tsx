import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import {
  Plus,
  FolderPlus,
  ChevronDown,
  PanelLeftClose,
  PanelRight,
  FileText,
} from "lucide-react";
import { UserCard } from "./UserCard";
import { Button } from "@/components/ui/button";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
  getStoredProjectsSectionOpen,
  setStoredProjectsSectionOpen,
} from "@/lib/sidebarStorage";
import type { ProjectWithSessions } from "./session-sidebar/workspaceTypes";
import { SidebarProjectGroup } from "./session-sidebar/SidebarProjectGroup";
import { SidebarSessionItem } from "./session-sidebar/SidebarSessionItem";
export type { ProjectWithSessions };

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

export function SessionSidebar({
  workspace,
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
  viewMode,
  onViewModeChange,
  onRunTutorial,
}: SessionSidebarProps) {
  const data = workspace;
  const createSession = useMutation(api.sessions.create);
  const createProject = useMutation(api.projects.create);
  const removeSession = useMutation(api.sessions.remove);
  const moveToProject = useMutation(api.sessions.moveToProject);
  const removeProject = useMutation(api.projects.remove);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateProjectName = useMutation(api.projects.updateName);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dragOverProjectId, setDragOverProjectId] = useState<
    string | "inbox" | null
  >(null);
  const [editingSessionId, setEditingSessionId] = useState<Id<"sessions"> | null>(
    null,
  );
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(
    null,
  );
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] =
    useState<Id<"projects"> | null>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const projectClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isCollapsed, setIsCollapsed] = useState(getStoredSidebarCollapsed);
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(
    getStoredProjectsSectionOpen,
  );

  useEffect(() => {
    setStoredSidebarCollapsed(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    setStoredProjectsSectionOpen(projectsSectionOpen);
  }, [projectsSectionOpen]);

  useEffect(() => {
    if (!data) return;
    if (activeSessionId) {
      for (const { project, sessions } of data) {
        const hasActive = sessions.some(
          (s: Doc<"sessions">) => s._id === activeSessionId,
        );
        if (hasActive) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- expand project for active session on navigation
          setExpandedProjectIds((prev) =>
            project ? new Set([...prev, project._id]) : prev,
          );
          break;
        }
      }
    }
  }, [data, activeSessionId]);

  const allSessions =
    data?.flatMap((g: ProjectWithSessions) => g.sessions) ?? [];

  const handleNewSession = async (projectId?: Id<"projects">) => {
    const targetProjectId = projectId;
    const id = await createSession({ projectId: targetProjectId ?? undefined });
    onSelectSession(id);
    if (targetProjectId) {
      onSelectProject(targetProjectId);
      setExpandedProjectIds((prev) => new Set([...prev, targetProjectId]));
    } else {
      onSelectProject(null);
    }
  };

  const handleNewProject = async () => {
    const id = await createProject();
    setExpandedProjectIds((prev) => new Set([...prev, id]));
  };

  const toggleProjectExpanded = (projectId: string | null) => {
    if (!projectId) return;
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleRename = async (id: Id<"sessions">, title: string) => {
    if (title?.trim()) {
      await updateTitle({ id, title: title.trim() });
    }
    setEditingSessionId(null);
  };

  const handleRenameProject = async (id: Id<"projects">, name: string) => {
    if (name?.trim()) {
      await updateProjectName({ id, name: name.trim() });
    }
    setEditingProjectId(null);
  };

  useEffect(() => {
    if (editingSessionId) {
      sessionInputRef.current?.focus();
      sessionInputRef.current?.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    if (editingProjectId) {
      projectInputRef.current?.focus();
      projectInputRef.current?.select();
    }
  }, [editingProjectId]);

  const handleDelete = async (id: Id<"sessions">) => {
    if (allSessions.length <= 1) return;
    setConfirmDeleteSessionId(null);
    const wasActive = activeSessionId === id;
    const deletedSession = allSessions.find((s: Doc<"sessions">) => s._id === id);
    const projectId = deletedSession?.projectId ?? null;
    await removeSession({ id });
    if (wasActive) {
      const remaining = allSessions.filter((s: Doc<"sessions">) => s._id !== id);
      const sameProject = remaining.filter(
        (s: Doc<"sessions">) => (s.projectId ?? null) === projectId,
      );
      const nextSession =
        sameProject[0] ?? (projectId != null ? remaining[0] : null) ?? null;
      onSelectSession(nextSession?._id ?? null);
      if (nextSession?.projectId) {
        onSelectProject(nextSession.projectId);
      }
    }
  };

  const handleMoveSession = async (
    sessionId: Id<"sessions">,
    targetProjectId: Id<"projects"> | null,
  ) => {
    const session = allSessions.find((s: Doc<"sessions">) => s._id === sessionId);
    if ((session?.projectId ?? null) === targetProjectId) return;
    await moveToProject({ id: sessionId, projectId: targetProjectId ?? undefined });
    if (activeSessionId === sessionId && targetProjectId) {
      onSelectProject(targetProjectId);
    }
    setDragOverProjectId(null);
  };

  const handleDeleteProject = async (id: Id<"projects">) => {
    setConfirmDeleteProjectId(null);
    const wasActiveProject = activeProjectId === id;
    await removeProject({ id });
    if (wasActiveProject) {
      onSelectProject(null);
      onSelectSession(null);
    }
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const viewModeIsNotesList = viewMode === "notesList";

  return (
    <aside
      className="shrink-0 flex flex-col h-screen overflow-hidden bg-muted/30 border-r border-border transition-[width] duration-200 ease-in-out"
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
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
            onClick={() => setIsCollapsed((c) => !c)}
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
          onClick={() => handleNewSession()}
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
          onClick={handleNewProject}
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
          aria-label="View files"
          aria-pressed={viewModeIsNotesList}
          data-tour="notes-toggle"
        >
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center"
            aria-hidden
          >
            <FileText className="size-4.5 stroke-[1.75]" />
          </span>
          {!isCollapsed && "Files"}
        </Button>
      </div>
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
                onMouseLeaveDeleteConfirm={() =>
                  setConfirmDeleteSessionId(null)
                }
              />
            ),
          )}
        </div>
      </nav>
      <div
        className={`flex flex-col gap-2 border-t border-border transition-[padding] duration-200 shrink-0 ${
          isCollapsed ? "p-2 items-center mt-auto" : "px-3 pt-3 pb-1.5"
        }`}
      >
        <UserCard
          compact={isCollapsed}
          menuDisabled={isCollapsed}
          onRunTutorial={onRunTutorial}
        />
      </div>
    </aside>
  );
}
