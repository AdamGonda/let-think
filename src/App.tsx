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
import { Toaster } from "./components/ui/sonner";
import { Sprout, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
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
  const hasEverHadSelectionRef = useRef(false);

  useEffect(() => {
    if (activeSessionId) hasEverHadSelectionRef.current = true;
  }, [activeSessionId]);

  useEffect(() => {
    if (
      sessions &&
      sessions.length > 0 &&
      !activeSessionId &&
      !hasEverHadSelectionRef.current
    ) {
      const first = sessions[0];
      setActiveSessionId(first._id);
      if (first.projectId) setActiveProjectId(first.projectId);
      hasEverHadSelectionRef.current = true;
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

  // Reset selected nodes and batch index when switching sessions
  useEffect(() => {
    setSelectedNodeIds(new Set());
    setSelectedBatchIndex(0);
  }, [activeSessionId]);

  // When graph batches grow, jump to the latest (controlled graph navigation)
  const batches = conceptGraph?.batches ?? [];
  const prevBatchesLengthRef = useRef(0);
  useEffect(() => {
    if (batches.length === 0) return;
    const prevLen = prevBatchesLengthRef.current;
    prevBatchesLengthRef.current = batches.length;
    if (batches.length > prevLen) {
      setSelectedBatchIndex(batches.length - 1);
    } else {
      setSelectedBatchIndex((i) => Math.min(i, batches.length - 1));
    }
  }, [batches.length]);

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
  const openBatchModalRef = useRef<((batchIndex: number) => void) | null>(null);

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
            <>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Step navigation">
                    {batches.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === selectedBatchIndex}
                        aria-label={`Go to step ${i + 1}`}
                        title={`Step ${i + 1}`}
                        onClick={() => setSelectedBatchIndex(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#16171d] ${
                          i === selectedBatchIndex
                            ? "bg-red-500"
                            : "bg-white hover:opacity-80"
                        }`}
                      />
                    ))}
                  </div>
            </div>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {batches.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedBatchIndex((i) => Math.max(0, i - 1))}
                    disabled={selectedBatchIndex <= 0}
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                    title="Previous step"
                    aria-label="Previous step"
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBatchIndex((i) => Math.min(batches.length - 1, i + 1))}
                    disabled={selectedBatchIndex >= batches.length - 1}
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                    title="Next step"
                    aria-label="Next step"
                  >
                    <ChevronRight size={20} strokeWidth={2} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setHistoryPanelOpen(true)}
                className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
                onClick={() => openBatchModalRef.current?.(selectedBatchIndex)}
                className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="View user input for this step"
                aria-label="View user input for this step"
              >
                <Sprout size={20} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
            </>
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
                selectedBatchIndex={selectedBatchIndex}
                onSelectedBatchIndexChange={setSelectedBatchIndex}
                openBatchModalRef={openBatchModalRef}
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
          batches={batches}
          selectedBatchIndex={selectedBatchIndex}
          onNavigateToStep={(batchIndex: number) => {
            setSelectedBatchIndex(batchIndex);
            setHistoryPanelOpen(false);
          }}
        />
      </main>
      </div>
      <Toaster theme={isDark ? "dark" : "light"} />
    </div>
  );
}

export default App;
