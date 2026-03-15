import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { SessionSidebar } from "./components/SessionSidebar";
import { Chat } from "./components/Chat";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";

function App() {
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const sessions = useQuery(api.sessions.list);
  const messages = useQuery(
    api.sessions.getMessages,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );
  const conceptGraph = useQuery(
    api.sessions.getConceptGraph,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0]._id);
    }
  }, [sessions, activeSessionId]);

  return (
    <div className="flex h-screen bg-white dark:bg-[#16171d]">
      <SessionSidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
      />
      <main className="flex flex-1 flex-col min-w-0">
        <div className="flex flex-1 min-h-0 flex-col">
          {isLoading && (
            <div className="flex w-full items-center justify-center gap-4 py-6 px-6 shrink-0 border-b-2 border-violet-700/30 dark:border-violet-400/30 bg-violet-700 dark:bg-violet-800">
              <svg
                className="animate-spin h-10 w-10 text-white shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xl font-semibold text-white animate-pulse">
                Thinking...
              </span>
            </div>
          )}
          <div className="flex flex-1 min-h-0 items-stretch justify-stretch">
            {activeSessionId ? (
              <ConceptGraphOverlay
                key={activeSessionId}
                graph={conceptGraph ?? null}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
                Select a chat or create a new one to get started
              </div>
            )}
          </div>
        </div>
        <Chat
          key={activeSessionId ?? "empty"}
          sessionId={activeSessionId}
          messageHistory={messages ?? []}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </main>
    </div>
  );
}

export default App;
