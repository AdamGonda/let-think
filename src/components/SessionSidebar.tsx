import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { Plus, FolderPlus, ChevronDown, Trash2, X, PanelLeftClose, PanelRight, FileText } from "lucide-react";
import { UserCard } from "./UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  sessions: Doc<"sessions">[];
};

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 56;

const STORAGE_KEY_SIDEBAR = "think-sidebar-collapsed";

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIDEBAR);
    return stored === "true";
  } catch {
    return false;
  }
}

interface SessionSidebarProps {
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
  onToggleTheme: () => void;
  isDark: boolean;
  viewMode: "graph" | "notesList";
  onViewModeChange: (mode: "graph" | "notesList") => void;
  onRunTutorial?: () => void;
}

export function SessionSidebar({
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
  onToggleTheme,
  isDark,
  viewMode,
  onViewModeChange,
  onRunTutorial,
}: SessionSidebarProps) {
  const data = useQuery(api.projects.listWithSessions);
  const createSession = useMutation(api.sessions.create);
  const createProject = useMutation(api.projects.create);
  const removeSession = useMutation(api.sessions.remove);
  const moveToProject = useMutation(api.sessions.moveToProject);
  const removeProject = useMutation(api.projects.remove);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateProjectName = useMutation(api.projects.updateName);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [dragOverProjectId, setDragOverProjectId] = useState<string | "inbox" | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<Id<"sessions"> | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<Id<"sessions"> | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<Id<"projects"> | null>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const projectClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR, String(isCollapsed));
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);

  // Expand project containing active session by default
  useEffect(() => {
    if (!data) return;
    if (activeSessionId) {
      for (const { project, sessions } of data) {
        const hasActive = sessions.some((s: Doc<"sessions">) => s._id === activeSessionId);
        if (hasActive) {
          setExpandedProjectIds((prev) =>
            project ? new Set([...prev, project._id]) : prev
          );
          break;
        }
      }
    }
  }, [data, activeSessionId]);

  const allSessions = data?.flatMap((g: ProjectWithSessions) => g.sessions) ?? [];

  const handleNewChat = async (projectId?: Id<"projects">) => {
    // Main "New chat" button creates in inbox; per-project + creates in that project
    const targetProjectId = projectId;
    const id = await createSession({ projectId: targetProjectId ?? undefined });
    onSelectSession(id);
    if (targetProjectId) {
      onSelectProject(targetProjectId);
      setExpandedProjectIds((prev) => new Set([...prev, targetProjectId]));
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
    setConfirmDeleteSessionId(null);
    const wasActive = activeSessionId === id;
    const deletedSession = allSessions.find((s: Doc<"sessions">) => s._id === id);
    const projectId = deletedSession?.projectId ?? null;
    await removeSession({ id });
    if (wasActive) {
      const remaining = allSessions.filter((s: Doc<"sessions">) => s._id !== id);
      // Prefer remaining sessions in the same project (or inbox) so focus stays there
      const sameProject = remaining.filter(
        (s: Doc<"sessions">) => (s.projectId ?? null) === projectId
      );
      // When deleting last inbox session, don't jump to a project—leave selection empty
      const nextSession = sameProject[0] ?? (projectId != null ? remaining[0] : null) ?? null;
      onSelectSession(nextSession?._id ?? null);
      if (nextSession?.projectId) {
        onSelectProject(nextSession.projectId);
      }
    }
  };

  const handleMoveSession = async (sessionId: Id<"sessions">, targetProjectId: Id<"projects"> | null) => {
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
        <Button
          variant="ghost"
          size="icon-sm"
          className={isCollapsed ? "h-9 w-9" : "w-full justify-start gap-2"}
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelRight className="size-5" />
          ) : (
            <>
              <PanelLeftClose className="size-5" />
              Collapse
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className={isCollapsed ? "h-10 w-10 p-0 justify-center" : "justify-start h-10 w-full"}
          onClick={() => handleNewChat()}
          aria-label="New chat"
          data-tour="new-chat"
        >
          <Plus className="size-5 shrink-0" />
          {!isCollapsed && "New chat"}
        </Button>
        <Button
          variant="ghost"
          className={isCollapsed ? "h-10 w-10 p-0 justify-center" : "justify-start h-10 w-full"}
          onClick={handleNewProject}
          aria-label="New project"
          data-tour="new-project"
        >
          <FolderPlus className="size-5 shrink-0" />
          {!isCollapsed && "New project"}
        </Button>
        <Button
          variant="ghost"
          className={`${isCollapsed ? "h-10 w-10 p-0 justify-center" : "justify-start h-10 w-full"} ${
            viewMode === "notesList"
              ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
              : "hover:bg-muted/50"
          }`}
          onClick={() =>
            onViewModeChange(viewMode === "notesList" ? "graph" : "notesList")
          }
          aria-label="View thinking notes"
          aria-pressed={viewMode === "notesList"}
          data-tour="notes-toggle"
        >
          <FileText className="size-5 shrink-0" />
          {!isCollapsed && "Notes"}
        </Button>
      </div>
      <nav
        className={`flex-1 overflow-y-auto py-3 flex flex-col gap-3 ${
          isCollapsed ? "hidden" : "px-3"
        }`}
      >
          {/* Projects section */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90 px-2 py-1">
              Projects
            </span>
            {data?.filter((g: ProjectWithSessions) => g.project).map((group: ProjectWithSessions) => {
            const project = group.project!;
            const sessions = group.sessions;
            const projectId = project._id;
            const isExpanded = expandedProjectIds.has(projectId);

            return (
              <div key={projectId} className="flex flex-col gap-1">
                  <div
                    className={`flex items-center gap-1 group/project rounded-lg transition-colors px-3 pl-0 ${
                      viewMode !== "notesList" && activeProjectId === projectId
                        ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent/40"
                        : ""
                    } ${
                      dragOverProjectId === project._id ? "ring-2 ring-ring ring-inset" : ""
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverProjectId(project._id);
                    }}
                    onDragLeave={() => setDragOverProjectId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sessionId = e.dataTransfer.getData("text/plain") as Id<"sessions">;
                      if (sessionId) {
                        handleMoveSession(sessionId, project._id);
                      }
                      setDragOverProjectId(null);
                    }}
                  >
                    {editingProjectId === project._id ? (
                      <Input
                        ref={projectInputRef}
                        type="text"
                        defaultValue={project.name}
                        className="flex-1 min-w-0 h-8 py-1 px-2 text-left text-sm font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameProject(project._id, (e.target as HTMLInputElement).value);
                          } else if (e.key === "Escape") {
                            setEditingProjectId(null);
                          }
                        }}
                        onBlur={(e) => {
                          handleRenameProject(project._id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (projectClickTimeoutRef.current) {
                            clearTimeout(projectClickTimeoutRef.current);
                            projectClickTimeoutRef.current = null;
                            return;
                          }
                          projectClickTimeoutRef.current = setTimeout(() => {
                            projectClickTimeoutRef.current = null;
                            toggleProjectExpanded(projectId);
                          }, 250);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (projectClickTimeoutRef.current) {
                            clearTimeout(projectClickTimeoutRef.current);
                            projectClickTimeoutRef.current = null;
                          }
                          setEditingProjectId(project._id);
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${project.name}, click to ${isExpanded ? "collapse" : "expand"}`}
                        className="flex-1 min-w-0 flex items-center gap-1 py-2.5 pr-2 pl-1.5 text-left rounded font-medium text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        <span className="shrink-0 flex items-center justify-center w-6 text-muted-foreground">
                          <ChevronDown
                            className={`size-4 transition-transform ${
                              sessions.length > 0 && isExpanded ? "" : "-rotate-90"
                            }`}
                          />
                        </span>
                        <span className="flex-1 min-w-0 truncate">{project.name}</span>
                      </button>
                    )}
                    {confirmDeleteProjectId !== project._id && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover/project:opacity-100 group-hover/project:pointer-events-auto pointer-events-none h-7 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewChat(project._id);
                        }}
                        aria-label="New chat in project"
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                    {confirmDeleteProjectId === project._id ? (
                      <div className="flex items-center gap-0.5 h-7 shrink-0">
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id);
                          }}
                          aria-label="Confirm delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteProjectId(null);
                          }}
                          aria-label="Cancel delete"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover/project:opacity-100 group-hover/project:pointer-events-auto pointer-events-none hover:bg-destructive/20 hover:text-destructive h-7 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteProjectId(project._id);
                        }}
                        aria-label="Delete project"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                {isExpanded &&
                  sessions.map((session: Doc<"sessions">) => (
                    <div
                      key={session._id}
                      draggable={editingSessionId !== session._id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", session._id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => {
                        if (editingSessionId !== session._id) {
                          onSelectSession(session._id);
                          if (session.projectId) onSelectProject(session.projectId);
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (editingSessionId !== session._id) {
                          e.stopPropagation();
                          setEditingSessionId(session._id);
                        }
                      }}
                      className={`group flex items-center gap-1 py-1.5 px-3 ml-4 rounded-r-lg border-y border-r border-transparent transition-colors cursor-grab active:cursor-grabbing select-none ${
                        viewMode !== "notesList" && activeSessionId === session._id
                          ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
                          : "border-l-2 border-l-transparent hover:bg-muted/50 hover:border-border"
                      }`}
                    >
                      {editingSessionId === session._id ? (
                        <Input
                          ref={sessionInputRef}
                          type="text"
                          defaultValue={session.title}
                          className="flex-1 min-w-0 h-8 py-1 px-2 text-left text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRename(session._id, (e.target as HTMLInputElement).value);
                            } else if (e.key === "Escape") {
                              setEditingSessionId(null);
                            }
                          }}
                          onBlur={(e) => {
                            handleRename(session._id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          className={`flex-1 min-w-0 text-left truncate pointer-events-none text-sm py-0.5 ${
                            viewMode !== "notesList" && activeSessionId === session._id
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {session.title}
                        </div>
                      )}
                      {confirmDeleteSessionId === session._id ? (
                        <div className="flex items-center gap-0.5 h-7 shrink-0">
                          <Button
                            variant="destructive"
                            size="icon-xs"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session._id);
                            }}
                            aria-label="Confirm delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteSessionId(null);
                            }}
                            aria-label="Cancel delete"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none hover:bg-destructive/20 hover:text-destructive h-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteSessionId(session._id);
                          }}
                          aria-label="Delete session"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            );
          })}
          </div>

          {/* Sessions section (sessions without a project) */}
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
                const sessionId = e.dataTransfer.getData("text/plain") as Id<"sessions">;
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
            {(data?.find((g: ProjectWithSessions) => !g.project)?.sessions ?? []).map((session: Doc<"sessions">) => (
              <div
                key={session._id}
                draggable={editingSessionId !== session._id}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", session._id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (editingSessionId !== session._id) {
                    onSelectSession(session._id);
                    onSelectProject(null);
                  }
                }}
                onDoubleClick={(e) => {
                  if (editingSessionId !== session._id) {
                    e.stopPropagation();
                    setEditingSessionId(session._id);
                  }
                }}
                className={`group flex items-center gap-1 py-1.5 px-3 rounded-r-lg border-y border-r border-transparent transition-colors cursor-grab active:cursor-grabbing select-none ${
                  viewMode !== "notesList" && activeSessionId === session._id
                    ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
                    : "border-l-2 border-l-transparent hover:bg-muted/50 hover:border-border"
                }`}
              >
                {editingSessionId === session._id ? (
                  <Input
                    ref={sessionInputRef}
                    type="text"
                    defaultValue={session.title}
                    className="flex-1 min-w-0 h-8 py-1 px-2 text-left text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRename(session._id, (e.target as HTMLInputElement).value);
                      } else if (e.key === "Escape") {
                        setEditingSessionId(null);
                      }
                    }}
                    onBlur={(e) => {
                      handleRename(session._id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                <div
                  className={`flex-1 min-w-0 text-left truncate pointer-events-none text-sm py-0.5 ${
                    viewMode !== "notesList" && activeSessionId === session._id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {session.title}
                </div>
                )}
                {confirmDeleteSessionId === session._id ? (
                  <div className="flex items-center gap-0.5 h-7 shrink-0">
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session._id);
                      }}
                      aria-label="Confirm delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteSessionId(null);
                      }}
                      aria-label="Cancel delete"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none hover:bg-destructive/20 hover:text-destructive h-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteSessionId(session._id);
                    }}
                    aria-label="Delete session"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
      </nav>
      <div
        className={`flex flex-col gap-2 border-t border-border transition-[padding] duration-200 ${
          isCollapsed ? "p-2 items-center" : "p-3"
        }`}
      >
        <UserCard
          onToggleTheme={onToggleTheme}
          isDark={isDark}
          compact={isCollapsed}
          onRunTutorial={onRunTutorial}
        />
      </div>
    </aside>
  );
}
