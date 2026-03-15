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
    <aside className="session-sidebar">
      <button
        type="button"
        className="new-chat-btn"
        onClick={handleNewChat}
      >
        + New chat
      </button>
      <nav className="session-list">
        {sessions?.map((session) => (
          <button
            key={session._id}
            type="button"
            className={`session-item ${activeSessionId === session._id ? "active" : ""}`}
            onClick={() => onSelectSession(session._id)}
          >
            {session.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
