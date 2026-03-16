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
import { MarkdownEditor } from "./components/MarkdownEditor";
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
  const [notes, setNotes] = useState("");
  const draftInputRef = useRef(draftInput);
  const notesRef = useRef(notes);
  draftInputRef.current = draftInput;
  notesRef.current = notes;
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

  // Load draft and thinking notes from Convex when session changes
  useEffect(() => {
    const prevId = prevSessionIdRef.current;
    const sessionChanged = prevId !== activeSessionId;

    if (sessionChanged && prevId != null) {
      updateDraft({ sessionId: prevId, draftInput: draftInputRef.current });
      updateThinkingNotes({
        sessionId: prevId,
        thinkingNotes: notesRef.current,
      });
    }
    prevSessionIdRef.current = activeSessionId;

    if (sessionChanged) {
      setDraftInput(activeSessionId == null ? "" : (storedDraft ?? ""));
      setNotes(
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
      saveDraft(draftInput);
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
      saveThinkingNotes(notes);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeSessionId, notes, saveThinkingNotes]);

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

  const showOverlay = isLoading || isInBreak;

  return (
    <div className="flex h-screen bg-white dark:bg-[#16171d]">
      {showOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-white dark:bg-[#1e1e1e]"
          aria-busy={isLoading}
          aria-live="polite"
        >
          <div className="shrink-0 py-6 flex flex-col items-center gap-1">
            <span className="text-zinc-500 dark:text-zinc-400 text-2xl font-medium uppercase tracking-widest">
              Wake up
            </span>
            {breakRemainingMs != null && breakRemainingMs > 0 && (
              <span className="text-zinc-500 dark:text-zinc-500 text-lg font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
          </div>
          {activeSessionId && (
            <div className="flex-1 min-h-0 flex flex-col items-center px-6 pb-8 overflow-hidden">
              <div className="w-full max-w-[720px] flex-1 min-h-0 flex flex-col">
                <MarkdownEditor
                  value={notes}
                  onChange={(v) => setNotes(v ?? "")}
                  placeholder="Take notes…"
                  variant="focused"
                  dark={isDark}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-1 min-w-0" inert={showOverlay}>
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
        {!showOverlay && (
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
        )}
      </main>
      </div>
    </div>
  );
}

export default App;
