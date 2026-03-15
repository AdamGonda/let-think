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
    <aside className="w-[260px] min-w-[260px] shrink-0 flex flex-col bg-zinc-50 dark:bg-[#1a1b22] border-r border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        className="m-3 py-2.5 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit cursor-pointer transition-colors duration-150 hover:bg-violet-500/10 dark:hover:bg-violet-400/15 hover:border-violet-500/50 dark:hover:border-violet-400/50"
        onClick={handleNewChat}
      >
        + New chat
      </button>
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {sessions?.map((session) => (
          <button
            key={session._id}
            type="button"
            className={`py-2.5 px-3 border-none rounded-md bg-transparent text-zinc-600 dark:text-zinc-400 font-inherit text-left cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-150 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 ${
              activeSessionId === session._id
                ? "bg-violet-500/10 dark:bg-violet-400/15 text-violet-600 dark:text-violet-400"
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
