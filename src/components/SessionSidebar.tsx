import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface SessionSidebarProps {
  activeSessionId: Id<"sessions"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
}

export function SessionSidebar({
  activeSessionId,
  onSelectSession,
}: SessionSidebarProps) {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const removeSession = useMutation(api.sessions.remove);
  const [openMenuId, setOpenMenuId] = useState<Id<"sessions"> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNewChat = async () => {
    const id = await createSession();
    onSelectSession(id);
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
    <aside className="w-[260px] shrink-0 flex flex-col h-screen bg-zinc-50 dark:bg-[#1a1b22] border-r border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        className="m-3 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit cursor-pointer hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50"
        onClick={handleNewChat}
      >
        + New chat
      </button>
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-2">
        {sessions?.map((session) => (
          <div
            key={session._id}
            className={`group flex items-center gap-1 py-1.5 px-3 rounded-lg border ${
              activeSessionId === session._id
                ? "bg-violet-500/20 dark:bg-violet-400/25 border-violet-500/50 dark:border-violet-400/50"
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
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100"
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
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-lg z-10">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    onClick={() => handleDelete(session._id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
