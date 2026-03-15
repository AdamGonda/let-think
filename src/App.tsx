import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { SessionSidebar } from "./components/SessionSidebar";
import { Chat } from "./components/Chat";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";
import "./App.css";

function App() {
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(
    null
  );
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
    <div className="app">
      <SessionSidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
      />
      <main className="main-content">
        <div className="graph-area">
          {activeSessionId ? (
            <ConceptGraphOverlay graph={conceptGraph ?? null} />
          ) : (
            <div className="graph-empty-state">
              Select a chat or create a new one to get started
            </div>
          )}
        </div>
        <Chat
          key={activeSessionId ?? "empty"}
          sessionId={activeSessionId}
          messageHistory={messages ?? []}
        />
      </main>
    </div>
  );
}

export default App;
