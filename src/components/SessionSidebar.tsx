import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

interface SessionSidebarProps {
  activeSessionId: Id<"sessions"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function SessionSidebar({
  activeSessionId,
  onSelectSession,
  onToggleTheme,
  isDark,
}: SessionSidebarProps) {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const removeSession = useMutation(api.sessions.remove);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const [openMenuId, setOpenMenuId] = useState<Id<"sessions"> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const handleNewChat = async () => {
    const id = await createSession();
    onSelectSession(id);
  };

  const handleRename = async (id: Id<"sessions">, currentTitle: string) => {
    const title = window.prompt("Rename chat", currentTitle);
    if (title?.trim()) {
      await updateTitle({ id, title: title.trim() });
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (id: Id<"sessions">) => {
    const wasActive = activeSessionId === id;
    await removeSession({ id });
    setOpenMenuId(null);
    if (wasActive && sessions) {
      const remaining = sessions.filter((s) => s._id !== id);
      onSelectSession(remaining[0]?._id ?? null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
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
            onClick={handleNewChat}
            aria-label="New chat"
            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-600 dark:text-zinc-400 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50 cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="flex-1 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit cursor-pointer hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50"
            onClick={handleNewChat}
          >
            + New chat
          </button>
        )}
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
        <button
          type="button"
          onClick={() => {
            setIsCollapsed((c) => !c);
            setOpenMenuId(null);
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
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-2">
        {sessions?.map((session) => (
          <div
            key={session._id}
            className={`group flex items-center gap-1 py-1.5 px-3 rounded-lg border transition-colors ${
              activeSessionId === session._id
                ? "bg-violet-500/20 dark:bg-violet-400/25 border-violet-500/50 dark:border-violet-400/50 hover:bg-violet-500/30 dark:hover:bg-violet-400/35"
                : "border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            <button
              type="button"
              className={`flex-1 min-w-0 text-left truncate font-inherit cursor-pointer ${
                activeSessionId === session._id
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
              onClick={() => onSelectSession(session._id)}
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
      </nav>
      )}
    </aside>
  );
}
