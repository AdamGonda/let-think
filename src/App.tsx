import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  useQuery,
  useMutation,
  AuthLoading,
  Unauthenticated,
  Authenticated,
} from "convex/react";
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
import { SignIn } from "./components/SignIn";

function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-[#16171d]">
          <span className="text-zinc-600 dark:text-zinc-400">Loading…</span>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <AppContent />
      </Authenticated>
    </>
  );
}

function AppContent() {
  const { toggleTheme, isDark } = useTheme();
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(
    null,
  );
  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const { breakRemainingMs } = useSessionManager(activeSessionId);
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;
  const [draftInput, setDraftInput] = useState("");
  const draftInputRef = useRef(draftInput);
  draftInputRef.current = draftInput;
  const [thinkingNotes, setThinkingNotes] = useState("");
  const thinkingNotesRef = useRef(thinkingNotes);
  thinkingNotesRef.current = thinkingNotes;
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const sessions = useQuery(api.sessions.list);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const messages = useQuery(
    api.sessions.getMessages,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const conceptGraph = useQuery(
    api.sessions.getConceptGraph,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const storedDraft = useQuery(
    api.sessions.getDraft,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const storedThinkingNotes = useQuery(
    api.sessions.getThinkingNotes,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const updateDraft = useMutation(api.sessions.updateDraft);
  const updateThinkingNotes = useMutation(api.sessions.updateThinkingNotes);
  const prevSessionIdRef = useRef<Id<"sessions"> | null>(null);

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
    const hasProjects = projectsWithSessions.some(
      (g: { project: unknown }) => g.project != null,
    );
    const inboxGroup = projectsWithSessions.find(
      (g: { project: unknown }) => g.project == null,
    );
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

  // Sync draft and thinking notes from DB when session changes
  useEffect(() => {
    const prevId = prevSessionIdRef.current;
    const sessionChanged = prevId !== activeSessionId;

    if (sessionChanged && prevId != null) {
      updateDraft({ sessionId: prevId, draftInput: draftInputRef.current });
      updateThinkingNotes({
        sessionId: prevId,
        thinkingNotes: thinkingNotesRef.current,
      });
    }
    prevSessionIdRef.current = activeSessionId;

    if (sessionChanged) {
      setDraftInput(activeSessionId == null ? "" : (storedDraft ?? ""));
      setThinkingNotes(
        activeSessionId == null ? "" : (storedThinkingNotes ?? ""),
      );
    }
  }, [
    activeSessionId,
    storedDraft,
    storedThinkingNotes,
    updateDraft,
    updateThinkingNotes,
  ]);

  // Debounced save when draft changes (same session)
  const saveDraft = useCallback(
    (value: string) => {
      if (activeSessionId) {
        updateDraft({ sessionId: activeSessionId, draftInput: value });
      }
    },
    [activeSessionId, updateDraft],
  );
  useEffect(() => {
    if (!activeSessionId) return;
    const timer = setTimeout(() => {
      saveDraft(draftInputRef.current);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeSessionId, draftInput, saveDraft]);

  // Debounced save when thinking notes change (same session)
  const saveThinkingNotes = useCallback(
    (value: string) => {
      if (activeSessionId) {
        updateThinkingNotes({
          sessionId: activeSessionId,
          thinkingNotes: value,
        });
      }
    },
    [activeSessionId, updateThinkingNotes],
  );
  useEffect(() => {
    if (!activeSessionId) return;
    const timer = setTimeout(() => {
      saveThinkingNotes(thinkingNotesRef.current);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeSessionId, thinkingNotes, saveThinkingNotes]);

  const selectedNodes = useMemo(() => {
    if (!conceptGraph?.nodes) return [];
    return conceptGraph.nodes.filter((n: { id: string }) =>
      selectedNodeIds.has(n.id),
    );
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
          className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-white dark:bg-[#16171d]"
          aria-busy={isLoading}
          aria-live="polite"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400 text-4xl font-medium uppercase">
              Wake up
            </span>
            {breakRemainingMs != null && breakRemainingMs > 0 && (
              <span className="text-zinc-500 dark:text-zinc-500 text-xl font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
          </div>
          {activeSessionId && (
            <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 p-4">
              <textarea
                rows={3}
                className="w-full py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit text-[0.95rem] placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:opacity-70 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 resize-none overflow-y-auto"
                value={thinkingNotes}
                onChange={(e) => setThinkingNotes(e.target.value)}
                placeholder="Keep writing... your thinking notes are saved"
              />
            </div>
          )}
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
        <div
          ref={mainContentRef}
          className="flex flex-1 min-h-0 flex-col relative"
        >
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
          draftInput={draftInput}
          setDraftInput={setDraftInput}
        />
      </main>
    </div>
  );
}

export default App;
