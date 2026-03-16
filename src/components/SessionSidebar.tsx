import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";

type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  sessions: Doc<"sessions">[];
};

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 72;
const TRANSITION_MS = 200;

interface SessionSidebarProps {
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function SessionSidebar({
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
  onToggleTheme,
  isDark,
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  // Delayed layout prevents jank: when expanding, keep icon-only until width
  // animation completes; when collapsing, switch immediately
  const [showExpandedContent, setShowExpandedContent] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isCollapsed) {
      setShowExpandedContent(false);
    } else {
      const t = setTimeout(() => setShowExpandedContent(true), TRANSITION_MS);
      return () => clearTimeout(t);
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

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const allSessions = data?.flatMap((g: ProjectWithSessions) => g.sessions) ?? [];
  const hasProjects = (data?.some((g) => g.project != null) ?? false);
  const isInboxSelected = activeProjectId === null && hasProjects;

  const handleNewChat = async (projectId?: Id<"projects">) => {
    const targetProjectId = projectId ?? activeProjectId ?? undefined;
    const id = await createSession({ projectId: targetProjectId ?? undefined });
    onSelectSession(id);
    if (targetProjectId) {
      onSelectProject(targetProjectId);
      setExpandedProjectIds((prev) => new Set([...prev, targetProjectId]));
    }
  };

  const handleNewProject = async () => {
    const id = await createProject();
    onSelectProject(id);
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
      const nextSession = sameProject[0] ?? remaining[0] ?? null;
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
      const remainingProjects = data?.filter(
        (g: ProjectWithSessions) => g.project && g.project._id !== id
      ) ?? [];
      const nextProjectId = remainingProjects[0]?.project?._id ?? null;
      onSelectProject(nextProjectId);
      const sessionsInNext = remainingProjects[0]?.sessions ?? [];
      onSelectSession(sessionsInNext[0]?._id ?? null);
    }
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <aside
      className="shrink-0 flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-[#1a1b22] border-r border-zinc-200 dark:border-zinc-700"
      style={{
        width: isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        transition: `width ${TRANSITION_MS}ms ease-in-out`,
      }}
    >
      <div className={`flex flex-col m-3 gap-1 min-w-0 ${showExpandedContent ? "" : "items-center"}`}>
        <button
          type="button"
          onClick={() => {
            if (!isCollapsed) {
              setShowExpandedContent(false);
            }
            setIsCollapsed((c) => !c);
          }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-2 rounded-lg text-zinc-600 h-[40px] dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0 w-full ${
            showExpandedContent ? "py-2.5 px-3" : "p-2.5 min-w-[40px]  justify-center"
          }`}
        >
          <svg
            className={`w-5 h-5 shrink-0 ${isCollapsed ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {showExpandedContent && <span>Collapse</span>}
        </button>
        <button
          type="button"
          onClick={() => handleNewChat()}
          aria-label="New chat"
          className={`flex items-center gap-2 rounded-lg text-zinc-600 h-[40px] dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0 w-full ${
            showExpandedContent ? "py-2.5 px-3" : "p-2.5 min-w-[40px] h-[40px] justify-center"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {showExpandedContent && <span>New chat</span>}
        </button>
        { showExpandedContent && <button
          type="button"
          onClick={handleNewProject}
          aria-label="New project"
          className={`flex items-center gap-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shrink-0 w-full ${
            showExpandedContent ? "py-2.5 px-3" : "p-2.5 min-w-[40px] min-h-[40px] justify-center"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M12 11v6" />
            <path d="M9 14h6" />
          </svg>
          <span>New project</span>
        </button>
        }
      </div>
      {showExpandedContent && (
        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3">
          {data?.map((group: ProjectWithSessions) => {
            const project = group.project;
            const sessions = group.sessions;
            const projectId = project?._id ?? null;
            const isExpanded = projectId
              ? expandedProjectIds.has(projectId)
              : true;

            // Hide inbox when it has no sessions
            if (!project && sessions.length === 0) return null;

            return (
              <div key={projectId ?? "inbox"} className="flex flex-col gap-1">
                {project ? (
                  <div
                    className={`flex items-center gap-1 group/project rounded-lg border transition-colors py-1.5 px-3 ${
                      activeProjectId === project._id
                        ? "bg-violet-500/20 dark:bg-violet-400/25 border-violet-500/50 dark:border-violet-400/50 hover:bg-violet-500/30 dark:hover:bg-violet-400/35"
                        : "border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    } ${dragOverProjectId === project._id ? "ring-2 ring-violet-500 dark:ring-violet-400 ring-inset" : ""}`}
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
                    {sessions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleProjectExpanded(projectId!)}
                        className="p-1 shrink-0 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                    {editingProjectId === project._id ? (
                      <input
                        ref={projectInputRef}
                        type="text"
                        defaultValue={project.name}
                        className="flex-1 min-w-0 py-1 px-2 text-left rounded text-sm font-medium bg-white dark:bg-zinc-800 border border-violet-500 dark:border-violet-400 text-zinc-900 dark:text-zinc-100 outline-none"
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
                        onClick={() => onSelectProject(project._id)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(project._id);
                        }}
                        className={`flex-1 min-w-0 py-1 px-2 text-left rounded truncate font-medium text-sm ${
                          activeProjectId === project._id
                            ? "text-violet-700 dark:text-violet-300"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {project.name}
                      </button>
                    )}
                    {confirmDeleteProjectId !== project._id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewChat(project._id);
                        }}
                        className="p-1 rounded cursor-pointer text-zinc-500 dark:text-zinc-400 opacity-0 group-hover/project:opacity-100 hover:bg-violet-500/20 dark:hover:bg-violet-400/20 hover:text-violet-700 dark:hover:text-violet-300 h-7 shrink-0 flex items-center justify-center"
                        aria-label="New chat in project"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    )}
                    {confirmDeleteProjectId === project._id ? (
                      <div className="flex items-center gap-0.5 h-7 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id);
                          }}
                          className="p-1 rounded bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 cursor-pointer"
                          aria-label="Confirm delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteProjectId(null);
                          }}
                          className="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer"
                          aria-label="Cancel delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteProjectId(project._id);
                        }}
                        className="p-1 rounded cursor-pointer text-zinc-500 dark:text-zinc-400 opacity-0 group-hover/project:opacity-100 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 h-7 shrink-0 flex items-center justify-center"
                        aria-label="Delete project"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-1 rounded-lg border transition-colors py-1.5 px-3 ${
                      isInboxSelected
                        ? "bg-violet-500/20 dark:bg-violet-400/25 border-violet-500/50 dark:border-violet-400/50 hover:bg-violet-500/30 dark:hover:bg-violet-400/35"
                        : "border-transparent"
                    } ${dragOverProjectId === "inbox" ? "ring-2 ring-violet-500 dark:ring-violet-400 ring-inset" : ""}`}
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
                    <button
                      type="button"
                      onClick={() => onSelectProject(null)}
                      className={`flex-1 min-w-0 py-1 px-2 text-left rounded text-sm font-medium truncate ${
                        isInboxSelected
                          ? "text-violet-700 dark:text-violet-300"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Inbox
                    </button>
                  </div>
                )}
                {isExpanded &&
                  sessions.map((session: Doc<"sessions">) => (
                    <div
                      key={session._id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", session._id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`group flex items-center gap-1 py-1.5 px-3 ml-4 rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                        activeSessionId === session._id
                          ? "bg-violet-500/20 dark:bg-violet-400/25 border-violet-500/50 dark:border-violet-400/50 hover:bg-violet-500/30 dark:hover:bg-violet-400/35"
                          : "border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {editingSessionId === session._id ? (
                        <input
                          ref={sessionInputRef}
                          type="text"
                          defaultValue={session.title}
                          className="flex-1 min-w-0 py-1 px-2 text-left rounded text-sm bg-white dark:bg-zinc-800 border border-violet-500 dark:border-violet-400 text-zinc-900 dark:text-zinc-100 outline-none"
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
                        />
                      ) : (
                        <button
                          type="button"
                          className={`flex-1 min-w-0 text-left truncate font-inherit cursor-pointer text-sm ${
                            activeSessionId === session._id
                              ? "text-violet-700 dark:text-violet-300"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                          onClick={() => {
                            onSelectSession(session._id);
                            if (session.projectId) onSelectProject(session.projectId);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(session._id);
                          }}
                        >
                          {session.title}
                        </button>
                      )}
                      {confirmDeleteSessionId === session._id ? (
                        <div className="flex items-center gap-0.5 h-7 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session._id);
                            }}
                            className="p-1 rounded bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 cursor-pointer"
                            aria-label="Confirm delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" x2="10" y1="11" y2="17" />
                              <line x1="14" x2="14" y1="11" y2="17" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteSessionId(null);
                            }}
                            className="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer"
                            aria-label="Cancel delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteSessionId(session._id);
                          }}
                          className="p-1 rounded cursor-pointer text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 h-7 shrink-0 flex items-center justify-center"
                          aria-label="Delete session"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            );
          })}
        </nav>
      )}
      <div className={`flex items-center p-3 border-t border-zinc-200 dark:border-zinc-700 ${showExpandedContent ? "" : "justify-center"}`}>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50 cursor-pointer shrink-0"
        >
          {isDark ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
