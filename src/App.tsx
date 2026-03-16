import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useTheme } from "./hooks/useTheme";
import {
  useSessionManager,
  formatBreakCountdown,
} from "./hooks/useSessionManager";
import { SessionSidebar } from "./components/SessionSidebar";
import { Chat } from "./components/Chat";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";

function App() {
  const { toggleTheme, isDark } = useTheme();
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(
    null
  );
  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { breakRemainingMs } = useSessionManager(activeSessionId);
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const sessions = useQuery(api.sessions.list);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
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
      const first = sessions[0];
      setActiveSessionId(first._id);
      if (first.projectId) setActiveProjectId(first.projectId);
    }
  }, [sessions, activeSessionId]);

  // Select inbox by default when empty (no projects, inbox empty) so the user
  // understands they're viewing the inbox and can create a new chat
  useEffect(() => {
    if (!projectsWithSessions) return;
    const hasProjects = projectsWithSessions.some((g) => g.project != null);
    const inboxGroup = projectsWithSessions.find((g) => g.project == null);
    const inboxEmpty = !inboxGroup || inboxGroup.sessions.length === 0;
    if (!hasProjects && inboxEmpty) {
      setActiveProjectId(null);
      setActiveSessionId(null);
    }
  }, [projectsWithSessions]);

  // Reset selected nodes when switching sessions
  useEffect(() => {
    setSelectedNodeIds(new Set());
  }, [activeSessionId]);

  const selectedNodes = useMemo(() => {
    if (!conceptGraph?.nodes) return [];
    return conceptGraph.nodes.filter((n: { id: string }) => selectedNodeIds.has(n.id));
  }, [conceptGraph?.nodes, selectedNodeIds]);

  const handleToggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleClearSelectedNodes = () => {
    setSelectedNodeIds(new Set());
  };

  const mainContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-screen bg-white dark:bg-[#16171d]">
      {(isLoading || isInBreak) && (
        <div
          className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-white dark:bg-[#16171d]"
          aria-busy={isLoading}
          aria-live="polite"
        >
          <span className="text-zinc-600 dark:text-zinc-400 text-4xl font-medium uppercase">
            {breakRemainingMs != null && breakRemainingMs > 0
              ? `Wake up in ${formatBreakCountdown(breakRemainingMs)}`
              : "Wake up"}
          </span>
        </div>
      )}
      <SessionSidebar
        activeSessionId={activeSessionId}
        activeProjectId={activeProjectId}
        onSelectSession={setActiveSessionId}
        onSelectProject={setActiveProjectId}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />
      <main className="flex flex-1 flex-col min-w-0">
        <div ref={mainContentRef} className="flex flex-1 min-h-0 flex-col relative">
          <div className="flex flex-1 min-h-0 items-stretch justify-stretch">
            {activeSessionId ? (
              <ConceptGraphOverlay
                key={activeSessionId}
                graph={conceptGraph ?? null}
                selectedNodeIds={selectedNodeIds}
                onToggleNodeSelection={handleToggleNodeSelection}
                modalContainerRef={mainContentRef}
                isLoading={isLoading}
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
          selectedNodes={selectedNodes}
          onMessageSent={handleClearSelectedNodes}
        />
      </main>
    </div>
  );
}

export default App;
