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
import { ChatHistoryPanel } from "./components/ChatHistoryPanel";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { SignIn } from "./components/SignIn";

function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-screen items-center justify-center bg-[#202024]">
          <span className="text-zinc-400">Loading…</span>
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
  const [modelRespondedAwaitingDismissal, setModelRespondedAwaitingDismissal] =
    useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
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
  const appliedStoredForSessionRef = useRef<Id<"sessions"> | null>(null);

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

  // Load draft and thinking notes from Convex when session changes or when stored data loads (e.g. after refresh)
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
      appliedStoredForSessionRef.current = null;
      setDraftInput(activeSessionId == null ? "" : (storedDraft ?? ""));
      setNotes(
        activeSessionId == null ? "" : (storedThinkingNotes ?? ""),
      );
      if (
        activeSessionId != null &&
        storedDraft !== undefined &&
        storedThinkingNotes !== undefined
      ) {
        appliedStoredForSessionRef.current = activeSessionId;
      }
    } else if (
      activeSessionId != null &&
      appliedStoredForSessionRef.current !== activeSessionId &&
      storedDraft !== undefined &&
      storedThinkingNotes !== undefined
    ) {
      // Stored data just loaded for current session (e.g. page refresh)
      setDraftInput(storedDraft ?? "");
      setNotes(storedThinkingNotes ?? "");
      appliedStoredForSessionRef.current = activeSessionId;
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

  const overlayActive =
    isLoading || isInBreak || editorOpen || modelRespondedAwaitingDismissal;
  const showOverlay = overlayActive && !overlayDismissed;

  useEffect(() => {
    if (!overlayActive) {
      setOverlayDismissed(false);
      setModelRespondedAwaitingDismissal(false);
    }
  }, [overlayActive]);

  const canExitOverlay = !isLoading && !isInBreak;

  const handleExitOverlay = () => {
    if (!canExitOverlay) return;
    setOverlayDismissed(true);
    setIsLoading(false);
    setEditorOpen(false);
    setModelRespondedAwaitingDismissal(false);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#16171d]">
      {showOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-[#1e2025]"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {canExitOverlay && (
            <button
              type="button"
              onClick={handleExitOverlay}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
              aria-label="Summarize and return to chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <text x="12" y="18" textAnchor="middle" fill="currentColor" fontSize="22" fontFamily="serif" fontWeight="600">Σ</text>
              </svg>
            </button>
          )}
          <div className="shrink-0 py-8 flex flex-col items-center gap-1">
            <span className="text-zinc-400 text-2xl font-medium uppercase tracking-[0.25em]">
              Wake up
            </span>
            {breakRemainingMs != null && breakRemainingMs > 0 && !editorOpen && (
              <span className="text-zinc-400 text-lg font-medium tabular-nums">
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
                  dark={true}
                  autoFocus
                  autoFocusEnd
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
          {!showOverlay && activeSessionId && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPanelOpen(true)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Conversation history"
                aria-label="Conversation history"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Open notes"
                aria-label="Open notes"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex flex-1 min-h-0 items-stretch justify-stretch">
            {activeSessionId ? (
              <ConceptGraphOverlay
                key={activeSessionId}
                graph={conceptGraph ?? null}
                selectedNodeIds={selectedNodeIds}
                onToggleNodeSelection={handleToggleNodeSelection}
                modalContainerRef={mainContentRef}
                isLoading={isLoading}
                isDark={isDark}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6 text-center">
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
            onModelResponded={() => setModelRespondedAwaitingDismissal(true)}
            selectedNodes={selectedNodes}
            onMessageSent={handleClearSelectedNodes}
            draftInput={draftInput}
            setDraftInput={setDraftInput}
          />
        )}
        <ChatHistoryPanel
          isOpen={historyPanelOpen}
          onClose={() => setHistoryPanelOpen(false)}
          messages={messages ?? []}
        />
      </main>
      </div>
    </div>
  );
}

export default App;
