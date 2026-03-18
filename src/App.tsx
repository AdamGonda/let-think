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
import { NotesListPanel } from "./components/NotesListPanel";
import { Chat } from "./components/Chat";
import { Tutorial, runTutorial, getTutorialCompleted } from "./components/Tutorial";
import { ChatHistoryPanel } from "./components/ChatHistoryPanel";
import { PaginationDots } from "./components/PaginationDots";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { SignIn } from "./components/SignIn";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { ChevronLeft, ChevronRight, FileText, History, Sigma, X } from "lucide-react";

function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <span className="text-muted-foreground">Loading…</span>
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
  const [viewMode, setViewMode] = useState<"graph" | "notesList">("graph");
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const { breakRemainingMs } = useSessionManager(activeSessionId);
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;
  const [draftInput, setDraftInput] = useState("");
  const [notes, setNotes] = useState("");
  const draftInputRef = useRef(draftInput);
  const notesRef = useRef(notes);
  draftInputRef.current = draftInput;
  notesRef.current = notes;
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
  const [notesEditorReady, setNotesEditorReady] = useState(false);
  const [notesSyncedForSessionId, setNotesSyncedForSessionId] = useState<Id<"sessions"> | null>(null);

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
  // understands they're viewing the inbox and can create a new session
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

  const batches = useMemo(
    () => conceptGraph?.batches ?? [],
    [conceptGraph?.batches]
  );
  const prevBatchesLengthRef = useRef(0);

  // When graph batches load or grow, jump to the latest (controlled graph navigation)
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
      setNotesSyncedForSessionId(null);
      setDraftInput(activeSessionId == null ? "" : (storedDraft ?? ""));
      setNotes("");
      if (
        activeSessionId != null &&
        storedDraft !== undefined &&
        storedThinkingNotes !== undefined
      ) {
        appliedStoredForSessionRef.current = activeSessionId;
        setNotes(storedThinkingNotes ?? "");
        setNotesSyncedForSessionId(activeSessionId);
      }
    } else if (
      activeSessionId != null &&
      appliedStoredForSessionRef.current !== activeSessionId &&
      storedDraft !== undefined &&
      storedThinkingNotes !== undefined
    ) {
      setDraftInput(storedDraft ?? "");
      setNotes(storedThinkingNotes ?? "");
      appliedStoredForSessionRef.current = activeSessionId;
      setNotesSyncedForSessionId(activeSessionId);
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

  /** Numbered concepts for the current batch - used to resolve @1, @2 in chat input */
  const numberedConcepts = useMemo(() => {
    if (!conceptGraph?.nodes) return [];
    const batch = batches[selectedBatchIndex];
    if (!batch?.nodeIds?.length) return [];
    const nodeMap = new Map(
      conceptGraph.nodes.map((n: { id: string; name: string; description?: string }) => [n.id, n])
    );
    const result: Array<{ id: string; name: string; description?: string; number: number }> = [];
    for (let i = 0; i < batch.nodeIds.length; i++) {
      const node = nodeMap.get(batch.nodeIds[i]!);
      if (node) result.push({ ...node, number: i + 1 });
    }
    return result;
  }, [conceptGraph?.nodes, batches, selectedBatchIndex]);

  /** Concept IDs referenced in current draft (@1, @2) – for card highlight. Only on latest batch. */
  const isLatestBatch =
    batches.length > 0 && selectedBatchIndex === batches.length - 1;
  const referencedConceptIds = useMemo(() => {
    if (!isLatestBatch) return new Set<string>();
    const ids = new Set<string>();
    const conceptByNumber = new Map(numberedConcepts.map((c) => [c.number, c]));
    const refRegex = /@(\d+)\b/g;
    let m: RegExpExecArray | null;
    while ((m = refRegex.exec(draftInput ?? "")) !== null) {
      const concept = conceptByNumber.get(parseInt(m[1]!, 10));
      if (concept) ids.add(concept.id);
    }
    return ids;
  }, [isLatestBatch, draftInput, numberedConcepts]);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const overlayActive =
    isLoading || isInBreak || editorOpen || modelRespondedAwaitingDismissal;
  // Don't show overlay when there's no session - would show only "Wake up" with no content/exit
  const showOverlay =
    overlayActive && !overlayDismissed && activeSessionId != null;

  useEffect(() => {
    if (!overlayActive) {
      setOverlayDismissed(false);
      setModelRespondedAwaitingDismissal(false);
    }
  }, [overlayActive]);

  // When session is cleared, reset overlay state to avoid stuck "Wake up" with no escape
  useEffect(() => {
    if (!activeSessionId) {
      setIsLoading(false);
      setEditorOpen(false);
      setModelRespondedAwaitingDismissal(false);
    }
  }, [activeSessionId]);

  const canExitOverlay = !isLoading && !isInBreak;

  // Reset notes editor ready when overlay closes so we show loading on next open
  useEffect(() => {
    if (!editorOpen) {
      setNotesEditorReady(false);
    }
  }, [editorOpen]);

  // Show loading until data is loaded AND we've painted at least one frame (avoids flicker when opening from graph with cached data)
  useEffect(() => {
    if (!editorOpen || !activeSessionId || storedThinkingNotes === undefined)
      return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setNotesEditorReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [editorOpen, activeSessionId, storedThinkingNotes]);

  const handleExitOverlay = () => {
    if (!canExitOverlay) return;
    setOverlayDismissed(true);
    setIsLoading(false);
    setEditorOpen(false);
    setModelRespondedAwaitingDismissal(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {showOverlay && (
        <div
          className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-background"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {canExitOverlay && (
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-4 right-4 z-10"
              onClick={handleExitOverlay}
              aria-label={viewMode === "notesList" ? "Close" : "Summarize and return to session"}
            >
              {viewMode === "notesList" ? (
                <X className="size-5" />
              ) : (
                <Sigma className="size-5" />
              )}
            </Button>
          )}
          <div className="shrink-0 py-8 flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-2xl font-medium uppercase tracking-[0.25em]">
              Wake up
            </span>
            {breakRemainingMs != null && breakRemainingMs > 0 && !editorOpen && (
              <span className="text-muted-foreground text-lg font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
          </div>
          {activeSessionId && (
            <div className="flex-1 min-h-0 flex flex-col items-center px-6 pb-8 overflow-hidden">
              <div className="w-full max-w-[720px] flex-1 min-h-0 flex flex-col">
                {storedThinkingNotes === undefined ||
                !notesEditorReady ||
                notesSyncedForSessionId !== activeSessionId ? (
                  <div
                    className="flex flex-1 min-h-0 flex flex-col rounded-xl bg-[#0A0A0A]"
                    aria-label="Loading notes"
                  />
                ) : (
                  <MarkdownEditor
                    value={notes}
                    onChange={(v) => setNotes(v ?? "")}
                    placeholder="Take notes…"
                    variant="focused"
                    dark={true}
                    autoFocus
                    autoFocusEnd
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <Tutorial
        autoStart={!getTutorialCompleted()}
        onComplete={() => {}}
      />
      <div className="flex flex-1 min-w-0" inert={showOverlay}>
        <SessionSidebar
          activeSessionId={activeSessionId}
          activeProjectId={activeProjectId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            if (viewMode === "notesList") setViewMode("graph");
          }}
          onSelectProject={setActiveProjectId}
          onToggleTheme={toggleTheme}
          isDark={isDark}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRunTutorial={runTutorial}
        />
        <main className="flex flex-1 flex-col min-w-0" data-tour="main-content">
        <div
          ref={mainContentRef}
          className="flex flex-1 min-h-0 flex-col"
        >
          {viewMode === "notesList" ? (
            <NotesListPanel
              onSelectSession={(session) => {
                setActiveSessionId(session._id);
                if (session.projectId) setActiveProjectId(session.projectId);
                else setActiveProjectId(null);
                setEditorOpen(true);
              }}
              onJumpToSession={(session) => {
                setActiveSessionId(session._id);
                if (session.projectId) setActiveProjectId(session.projectId);
                else setActiveProjectId(null);
                setViewMode("graph");
              }}
            />
          ) : (
          <>
          {!showOverlay && activeSessionId && (
            <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 py-3 px-4 border-b border-border">
              <div className="min-w-0" />
              <div className="flex justify-center">
                {batches.length > 1 && (
                  <div
                    data-slot="button-group"
                    className="flex items-center border border-border rounded-lg overflow-hidden bg-background dark:bg-input/30"
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-none border-0 border-r border-border"
                      onClick={() =>
                        setSelectedBatchIndex((i) => Math.max(0, i - 1))
                      }
                      disabled={selectedBatchIndex <= 0}
                      title="Previous step"
                      aria-label="Previous step"
                    >
                      <ChevronLeft size={20} strokeWidth={2} />
                    </Button>
                    <div className="h-7 px-2 min-w-28 flex items-center justify-center shrink-0">
                      <PaginationDots
                        currentIndex={selectedBatchIndex}
                        totalItems={batches.length}
                        onSelect={setSelectedBatchIndex}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-none border-0"
                      onClick={() =>
                        setSelectedBatchIndex((i) =>
                          Math.min(batches.length - 1, i + 1)
                        )
                      }
                      disabled={selectedBatchIndex >= batches.length - 1}
                      title="Next step"
                      aria-label="Next step"
                    >
                      <ChevronRight size={20} strokeWidth={2} />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setHistoryPanelOpen(true)}
                title="Conversation history"
                aria-label="Conversation history"
                data-tour="history-btn"
              >
                <History className="size-5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setEditorOpen(true)}
                title="Open notes"
                aria-label="Open notes"
                data-tour="notes-btn"
              >
                <FileText className="size-5" />
              </Button>
              </div>
            </header>
          )}
          <div className="flex flex-1 min-h-0 items-stretch justify-stretch" data-tour="graph-area">
            {activeSessionId ? (
              <ConceptGraphOverlay
                key={activeSessionId}
                graph={conceptGraph ?? null}
                isLoading={isLoading}
                isDark={isDark}
                selectedBatchIndex={selectedBatchIndex}
                onSelectedBatchIndexChange={setSelectedBatchIndex}
                referencedConceptIds={referencedConceptIds}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground text-base py-6 px-6 text-center">
                Select a session or create a new one to get started
              </div>
            )}
          </div>
          </>
          )}
        </div>
        {!showOverlay && viewMode === "graph" &&
          (batches.length === 0 ||
            selectedBatchIndex === batches.length - 1) && (
            <Chat
              key={activeSessionId ?? "empty"}
              sessionId={activeSessionId}
              messageHistory={messages ?? []}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onModelResponded={() => setModelRespondedAwaitingDismissal(true)}
              numberedConcepts={numberedConcepts}
              draftInput={draftInput}
              setDraftInput={setDraftInput}
            />
          )}
        {viewMode === "graph" && (
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
        )}
      </main>
      </div>
      <Toaster theme={isDark ? "dark" : "light"} />
    </div>
  );
}

export default App;
