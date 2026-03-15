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
  const [openMenuId, setOpenMenuId] = useState<Id<"sessions"> | Id<"projects"> | null>(null);
  const [projectMenuId, setProjectMenuId] = useState<Id<"projects"> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [dragOverProjectId, setDragOverProjectId] = useState<string | "inbox" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

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

  const handleRename = async (id: Id<"sessions">, currentTitle: string) => {
    const title = window.prompt("Rename chat", currentTitle);
    if (title?.trim()) {
      await updateTitle({ id, title: title.trim() });
    }
    setOpenMenuId(null);
  };

  const handleRenameProject = async (id: Id<"projects">, currentName: string) => {
    const name = window.prompt("Rename project", currentName);
    if (name?.trim()) {
      await updateProjectName({ id, name: name.trim() });
    }
    setProjectMenuId(null);
  };

  const handleDelete = async (id: Id<"sessions">) => {
    const wasActive = activeSessionId === id;
    await removeSession({ id });
    setOpenMenuId(null);
    if (wasActive) {
      const remaining = allSessions.filter((s: Doc<"sessions">) => s._id !== id);
      onSelectSession(remaining[0]?._id ?? null);
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
    const wasActiveProject = activeProjectId === id;
    await removeProject({ id });
    setProjectMenuId(null);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setProjectMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside
      className="shrink-0 flex flex-col h-screen bg-zinc-50 dark:bg-[#1a1b22] border-r border-zinc-200 dark:border-zinc-700 transition-[width] duration-200 ease-in-out"
      style={{ width: isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
      <div className={`flex m-3 gap-2 ${isCollapsed ? "flex-col items-center" : ""}`}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => handleNewChat()}
            aria-label="New chat"
            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50 cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit cursor-pointer hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50"
              onClick={() => handleNewChat()}
            >
              + New chat
            </button>
            <button
              type="button"
              className="py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50 cursor-pointer shrink-0"
              onClick={handleNewProject}
              aria-label="New project"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setIsCollapsed((c) => !c);
            setOpenMenuId(null);
            setProjectMenuId(null);
          }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50 cursor-pointer shrink-0"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
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
        </button>
      </div>
      {!isCollapsed && (
        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3">
          {data?.map((group: ProjectWithSessions) => {
            const project = group.project;
            const sessions = group.sessions;
            const projectId = project?._id ?? null;
            const isExpanded = projectId
              ? expandedProjectIds.has(projectId)
              : true;

            return (
              <div key={projectId ?? "inbox"} className="flex flex-col gap-1">
                {project ? (
                  <div
                    className={`flex items-center gap-1 group/project rounded-md transition-colors ${
                      activeProjectId === project._id
                        ? "bg-violet-500/15 dark:bg-violet-400/20 border-l-2 border-violet-500 dark:border-violet-400"
                        : "border-l-2 border-transparent"
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
                    <button
                      type="button"
                      onClick={() => onSelectProject(project._id)}
                      className={`flex-1 min-w-0 py-1.5 px-2 text-left rounded truncate font-medium ${
                        activeProjectId === project._id
                          ? "text-violet-700 dark:text-violet-300"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {project.name}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/project:opacity-100">
                      <div className="relative" ref={projectMenuId === project._id ? projectMenuRef : undefined}>
                        <button
                          type="button"
                          className="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectMenuId(projectMenuId === project._id ? null : project._id);
                          }}
                          aria-label="Project menu"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="6" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="18" r="1.5" />
                          </svg>
                        </button>
                        {projectMenuId === project._id && (
                          <div className="absolute left-0 top-full mt-1 py-1.5 min-w-[160px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-xl z-20">
                            <button
                              type="button"
                              className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
                              onClick={() => handleRenameProject(project._id, project.name)}
                            >
                              <svg className="shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                              Rename
                            </button>
                            <button
                              type="button"
                              className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
                              onClick={() => handleDeleteProject(project._id)}
                            >
                              <svg className="shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-1 rounded-md transition-colors ${
                      activeProjectId === null
                        ? "bg-violet-500/15 dark:bg-violet-400/20 border-l-2 border-violet-500 dark:border-violet-400"
                        : "border-l-2 border-transparent"
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
                      className={`flex-1 min-w-0 py-1.5 px-2 text-left rounded text-sm font-medium truncate ${
                        activeProjectId === null
                          ? "text-violet-700 dark:text-violet-300"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                      >
                        {session.title}
                      </button>
                      <div className="relative shrink-0" ref={openMenuId === session._id ? menuRef : undefined}>
                        <button
                          type="button"
                          className="p-1 rounded cursor-pointer text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100 hover:bg-violet-500/20 dark:hover:bg-violet-400/25 hover:text-violet-700 dark:hover:text-violet-300"
                          data-open={openMenuId === session._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === session._id ? null : session._id);
                          }}
                          aria-label="Session menu"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <circle cx="12" cy="6" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="18" r="1.5" />
                          </svg>
                        </button>
                        {openMenuId === session._id && (
                          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 py-1.5 min-w-[180px] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-xl z-10">
                            <button
                              type="button"
                              className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
                              onClick={() => handleRename(session._id, session.title)}
                            >
                              <svg className="shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                              Rename
                            </button>
                            <button
                              type="button"
                              className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
                              onClick={() => handleDelete(session._id)}
                            >
                              <svg className="shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" x2="10" y1="11" y2="17" />
                                <line x1="14" x2="14" y1="11" y2="17" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </nav>
      )}
      <div className={`flex items-center p-3 border-t border-zinc-200 dark:border-zinc-700 ${isCollapsed ? "justify-center" : ""}`}>
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
