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
import { formatBreakCountdown } from "./hooks/useSessionManager";
import { SessionDataProvider, useSessionData } from "./contexts/SessionDataContext";
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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, History, Sigma, X } from "lucide-react";
import { StepNavigator } from "./components/StepNavigator";

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
  const [isExitingOverlay, setIsExitingOverlay] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"graph" | "notesList">("graph");
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [draftInput, setDraftInput] = useState("");
  const [notes, setNotes] = useState("");
  const draftInputRef = useRef(draftInput);
  const notesRef = useRef(notes);
  draftInputRef.current = draftInput;
  notesRef.current = notes;
  const sessions = useQuery(api.sessions.list);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const createSessionMutation = useMutation(api.sessions.create);
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

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const id = await createSessionMutation({});
    setActiveSessionId(id);
    setActiveProjectId(null);
    hasEverHadSelectionRef.current = true;
    return id;
  }, [createSessionMutation, setActiveSessionId, setActiveProjectId]);

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
      setNotes("");
      if (
        activeSessionId != null &&
        storedDraft !== undefined &&
        storedThinkingNotes !== undefined
      ) {
        appliedStoredForSessionRef.current = activeSessionId;
        setNotes(storedThinkingNotes ?? "");
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

  const mainContentRef = useRef<HTMLDivElement>(null);

  // When session is cleared, reset overlay state to avoid stuck "Wake up" with no escape
  useEffect(() => {
    if (!activeSessionId) {
      setIsLoading(false);
      setEditorOpen(false);
      setModelRespondedAwaitingDismissal(false);
      setIsExitingOverlay(false);
    }
  }, [activeSessionId]);

  const WAKE_UP_EXIT_DURATION_MS = 300;
  useEffect(() => {
    if (!isExitingOverlay) return;
    const id = setTimeout(() => {
      setOverlayDismissed(true);
      setIsLoading(false);
      setEditorOpen(false);
      setModelRespondedAwaitingDismissal(false);
      setIsExitingOverlay(false);
    }, WAKE_UP_EXIT_DURATION_MS);
    return () => clearTimeout(id);
  }, [isExitingOverlay]);

  return (
    <SessionDataProvider sessionId={activeSessionId}>
      <AppContentBody
        onCreateSessionForFirstMessage={
          !activeSessionId ? handleCreateSessionForFirstMessage : undefined
        }
        activeSessionId={activeSessionId}
        activeProjectId={activeProjectId}
        setActiveSessionId={setActiveSessionId}
        setActiveProjectId={setActiveProjectId}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        modelRespondedAwaitingDismissal={modelRespondedAwaitingDismissal}
        setModelRespondedAwaitingDismissal={setModelRespondedAwaitingDismissal}
        overlayDismissed={overlayDismissed}
        setOverlayDismissed={setOverlayDismissed}
        isExitingOverlay={isExitingOverlay}
        setIsExitingOverlay={setIsExitingOverlay}
        editorOpen={editorOpen}
        setEditorOpen={setEditorOpen}
        historyPanelOpen={historyPanelOpen}
        setHistoryPanelOpen={setHistoryPanelOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedBatchIndex={selectedBatchIndex}
        setSelectedBatchIndex={setSelectedBatchIndex}
        draftInput={draftInput}
        setDraftInput={setDraftInput}
        notes={notes}
        setNotes={setNotes}
        mainContentRef={mainContentRef}
      />
    </SessionDataProvider>
  );
}

function AppContentBody({
  onCreateSessionForFirstMessage,
  activeSessionId,
  activeProjectId,
  setActiveSessionId,
  setActiveProjectId,
  isLoading,
  setIsLoading,
  modelRespondedAwaitingDismissal,
  setModelRespondedAwaitingDismissal,
  overlayDismissed,
  setOverlayDismissed,
  isExitingOverlay,
  setIsExitingOverlay,
  editorOpen,
  setEditorOpen,
  historyPanelOpen,
  setHistoryPanelOpen,
  viewMode,
  setViewMode,
  selectedBatchIndex,
  setSelectedBatchIndex,
  draftInput,
  setDraftInput,
  notes,
  setNotes,
  mainContentRef,
}: {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  setActiveSessionId: (id: Id<"sessions"> | null) => void;
  setActiveProjectId: (id: Id<"projects"> | null) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  modelRespondedAwaitingDismissal: boolean;
  setModelRespondedAwaitingDismissal: (v: boolean) => void;
  overlayDismissed: boolean;
  setOverlayDismissed: (v: boolean) => void;
  isExitingOverlay: boolean;
  setIsExitingOverlay: (v: boolean) => void;
  editorOpen: boolean;
  setEditorOpen: (v: boolean) => void;
  historyPanelOpen: boolean;
  setHistoryPanelOpen: (v: boolean) => void;
  viewMode: "graph" | "notesList";
  setViewMode: (v: "graph" | "notesList") => void;
  selectedBatchIndex: number;
  setSelectedBatchIndex: React.Dispatch<React.SetStateAction<number>>;
  draftInput: string;
  setDraftInput: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    conceptGraph,
    messages,
    batches,
    breakRemainingMs,
  } = useSessionData();
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;
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
  }, [batches.length, setSelectedBatchIndex]);

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

  const overlayActive =
    isLoading || isInBreak || editorOpen || modelRespondedAwaitingDismissal;
  const showOverlay =
    overlayActive && !overlayDismissed && activeSessionId != null;
  const canExitOverlay = !isLoading && !isInBreak;
  const chatVisible =
    viewMode === "graph" &&
    (batches.length === 0 || selectedBatchIndex === batches.length - 1);

  // Delay revealing the editor until after it has rendered and scrolled to caret
  const [editorRevealReady, setEditorRevealReady] = useState(false);
  useEffect(() => {
    if (!showOverlay || isExitingOverlay) {
      setEditorRevealReady(false);
      return;
    }
    const id = setTimeout(() => setEditorRevealReady(true), 50);
    return () => clearTimeout(id);
  }, [showOverlay, isExitingOverlay]);

  const handleExitOverlay = () => {
    if (!canExitOverlay) return;
    setIsExitingOverlay(true);
  };
  useEffect(() => {
    if (!overlayActive) {
      setOverlayDismissed(false);
      setModelRespondedAwaitingDismissal(false);
    }
  }, [overlayActive, setOverlayDismissed, setModelRespondedAwaitingDismissal]);

  return (
    <div className="flex h-screen bg-background">
      {(showOverlay || isExitingOverlay) && (
        <div
          className={`fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-background ${
            isExitingOverlay ? "animate-wake-up-out" : "animate-wake-up-in"
          }`}
          aria-busy={isLoading}
          aria-live="polite"
        >
          {/* Hide overlay content immediately when exiting to avoid text/cards overlap during fade */}
          <div
            className={`flex flex-1 min-h-0 flex-col transition-opacity duration-75 ${
              isExitingOverlay ? "opacity-0" : "opacity-100"
            }`}
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
                <div
                  className={`relative w-full max-w-[720px] flex-1 min-h-0 flex flex-col transition-opacity duration-150 ${
                    editorRevealReady ? "opacity-100" : "opacity-0"
                  }`}
                >
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
        </div>
      )}
      <Tutorial
        autoStart={!getTutorialCompleted()}
        onComplete={() => {}}
      />
      <div className="flex flex-1 min-w-0" inert={showOverlay || isExitingOverlay}>
        <SessionSidebar
          activeSessionId={activeSessionId}
          activeProjectId={activeProjectId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            if (viewMode === "notesList") setViewMode("graph");
          }}
          onSelectProject={setActiveProjectId}
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
          {activeSessionId && (
            <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 py-3 px-4 border-b border-border">
              <div className="min-w-0" />
              <div className="flex justify-center">
                <StepNavigator
                  totalSteps={batches.length}
                  selectedIndex={selectedBatchIndex}
                  onSelect={(index) => setSelectedBatchIndex(index)}
                />
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
            <ConceptGraphOverlay
              key={activeSessionId ?? "empty"}
              graph={conceptGraph ?? null}
              isLoading={isLoading}
              selectedBatchIndex={selectedBatchIndex}
              onSelectedBatchIndexChange={setSelectedBatchIndex}
              referencedConceptIds={referencedConceptIds}
            />
          </div>
          </>
          )}
        </div>
        {chatVisible && (
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
                onCreateSession={onCreateSessionForFirstMessage}
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
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
