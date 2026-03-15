import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface SessionSidebarProps {
  activeSessionId: Id<"sessions"> | null;
  onSelectSession: (id: Id<"sessions">) => void;
}

export function SessionSidebar({
  activeSessionId,
  onSelectSession,
}: SessionSidebarProps) {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);

  const handleNewChat = async () => {
    const id = await createSession();
    onSelectSession(id);
  };

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
          <button
            key={session._id}
            type="button"
            className={`py-1.5 px-3 rounded-lg border border-transparent text-left text-zinc-600 dark:text-zinc-400 font-inherit cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 ${
              activeSessionId === session._id
                ? "bg-violet-500/20 dark:bg-violet-400/25 text-violet-700 dark:text-violet-300 border-violet-500/50 dark:border-violet-400/50"
                : ""
            }`}
            onClick={() => onSelectSession(session._id)}
          >
            {session.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
