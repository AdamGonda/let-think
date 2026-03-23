import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useAtom, useSetAtom } from "jotai";
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
import {
  SessionDataProvider,
  useSessionData,
} from "./contexts/SessionDataContext";
import {
  SessionSidebar,
  type ProjectWithSessions,
} from "./components/SessionSidebar";
import { NotesListPanel } from "./components/NotesListPanel";
import { NoteBreadcrumb } from "./components/NoteBreadcrumb";
import { Chat } from "./components/Chat";
import {
  Tutorial,
  runTutorial,
  getTutorialCompleted,
} from "./components/Tutorial";
import { ChatHistoryPanel } from "./components/ChatHistoryPanel";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { SignIn } from "./components/SignIn";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { FileText, History, Sigma } from "lucide-react";
import { StepNavigator } from "./components/StepNavigator";
import { WorkPreferenceSync } from "./components/WorkPreferenceSync";
import {
  activeSessionIdAtom,
  activeProjectIdAtom,
  draftInputAtom,
  notesAtom,
  isLoadingAtom,
  modelRespondedAwaitingDismissalAtom,
  overlayDismissedAtom,
  isExitingOverlayAtom,
  editorOpenAtom,
  historyPanelOpenAtom,
  notesListDrillAtom,
  viewModeAtom,
  selectedBatchIndexAtom,
} from "./atoms/appAtoms";

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
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const setActiveProjectId = useSetAtom(activeProjectIdAtom);
  const [draftInput, setDraftInput] = useAtom(draftInputAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [isExitingOverlay, setIsExitingOverlay] = useAtom(
    isExitingOverlayAtom,
  );
  const setIsLoading = useSetAtom(isLoadingAtom);
  const setModelRespondedAwaitingDismissal = useSetAtom(
    modelRespondedAwaitingDismissalAtom,
  );
  const setOverlayDismissed = useSetAtom(overlayDismissedAtom);
  const setEditorOpen = useSetAtom(editorOpenAtom);

  const draftInputRef = useRef(draftInput);
  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    draftInputRef.current = draftInput;
    notesRef.current = notes;
  });
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const allSessionsSorted = useMemo(() => {
    if (!projectsWithSessions) return undefined;
    return projectsWithSessions
      .flatMap((g) => g.sessions)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [projectsWithSessions]);
  const createSessionMutation = useMutation(api.sessions.create);
  const storedEditor = useQuery(
    api.sessions.getEditorFields,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const storedDraft = storedEditor?.draftInput;
  const storedThinkingNotes = storedEditor?.thinkingNotes;
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
      allSessionsSorted &&
      allSessionsSorted.length > 0 &&
      !activeSessionId &&
      !hasEverHadSelectionRef.current
    ) {
      const first = allSessionsSorted[0]!;
      setActiveSessionId(first._id);
      if (first.projectId) setActiveProjectId(first.projectId);
      hasEverHadSelectionRef.current = true;
    }
  }, [allSessionsSorted, activeSessionId, setActiveSessionId, setActiveProjectId]);

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
  }, [projectsWithSessions, setActiveProjectId, setActiveSessionId]);

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
    setDraftInput,
    setNotes,
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
  }, [
    activeSessionId,
    setIsLoading,
    setEditorOpen,
    setModelRespondedAwaitingDismissal,
    setIsExitingOverlay,
  ]);

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
  }, [
    isExitingOverlay,
    setOverlayDismissed,
    setIsLoading,
    setEditorOpen,
    setModelRespondedAwaitingDismissal,
    setIsExitingOverlay,
  ]);

  return (
    <>
      <WorkPreferenceSync />
      <SessionDataProvider sessionId={activeSessionId}>
        <AppContentBody
          onCreateSessionForFirstMessage={
            !activeSessionId ? handleCreateSessionForFirstMessage : undefined
          }
          workspace={projectsWithSessions}
          mainContentRef={mainContentRef}
        />
      </SessionDataProvider>
    </>
  );
}

function AppContentBody({
  onCreateSessionForFirstMessage,
  workspace,
  mainContentRef,
}: {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [activeProjectId, setActiveProjectId] = useAtom(activeProjectIdAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [modelRespondedAwaitingDismissal, setModelRespondedAwaitingDismissal] =
    useAtom(modelRespondedAwaitingDismissalAtom);
  const [overlayDismissed, setOverlayDismissed] = useAtom(overlayDismissedAtom);
  const [isExitingOverlay, setIsExitingOverlay] = useAtom(
    isExitingOverlayAtom,
  );
  const [editorOpen, setEditorOpen] = useAtom(editorOpenAtom);
  const [historyPanelOpen, setHistoryPanelOpen] = useAtom(historyPanelOpenAtom);
  const [notesListDrill, setNotesListDrill] = useAtom(notesListDrillAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [selectedBatchIndex, setSelectedBatchIndex] = useAtom(
    selectedBatchIndexAtom,
  );
  const [draftInput, setDraftInput] = useAtom(draftInputAtom);
  const [notes, setNotes] = useAtom(notesAtom);

  const activeSessionInWorkspace =
    workspace && activeSessionId
      ? (() => {
          for (const g of workspace) {
            const s = g.sessions.find((x) => x._id === activeSessionId);
            if (s)
              return {
                session: s,
                projectName: g.project?.name ?? "Inbox",
                projectId: g.project?._id ?? null,
              };
          }
          return undefined;
        })()
      : undefined;

  const {
    conceptGraph,
    messages,
    batches,
    breakRemainingMs,
    loadOlderMessages,
    canLoadOlderMessages,
    messagesLoading,
  } = useSessionData();
  const hasChatHistory =
    messages.length > 0 || canLoadOlderMessages;

  useEffect(() => {
    if (!historyPanelOpen || !activeSessionId || messagesLoading) return;
    if (!hasChatHistory) setHistoryPanelOpen(false);
  }, [
    historyPanelOpen,
    activeSessionId,
    messagesLoading,
    hasChatHistory,
    setHistoryPanelOpen,
  ]);
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
      conceptGraph.nodes.map(
        (n: { id: string; name: string; description?: string }) => [n.id, n],
      ),
    );
    const result: Array<{
      id: string;
      name: string;
      description?: string;
      number: number;
    }> = [];
    for (let i = 0; i < batch.nodeIds.length; i++) {
      const node = nodeMap.get(batch.nodeIds[i]!);
      if (node) result.push({ ...node, number: i + 1 });
    }
    return result;
  }, [conceptGraph, batches, selectedBatchIndex]);

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
      queueMicrotask(() => setEditorRevealReady(false));
      return;
    }
    const id = setTimeout(() => setEditorRevealReady(true), 50);
    return () => clearTimeout(id);
  }, [showOverlay, isExitingOverlay]);

  const handleExitOverlay = useCallback(() => {
    if (!canExitOverlay) return;
    setIsExitingOverlay(true);
  }, [canExitOverlay, setIsExitingOverlay]);

  const handleBreadcrumbProjectClick = useCallback(() => {
    setNotesListDrill(null);
    handleExitOverlay();
  }, [handleExitOverlay, setNotesListDrill]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    if (!activeSessionInWorkspace) return;
    if (activeSessionInWorkspace.projectId) {
      setActiveProjectId(activeSessionInWorkspace.projectId);
      setNotesListDrill({ type: "project", id: activeSessionInWorkspace.projectId });
    } else {
      setActiveProjectId(null);
      setNotesListDrill({ type: "inbox" });
    }
    handleExitOverlay();
  }, [
    activeSessionInWorkspace,
    handleExitOverlay,
    setActiveProjectId,
    setNotesListDrill,
  ]);

  const handleBreadcrumbFileClick = useCallback(() => {
    setViewMode("graph");
    handleExitOverlay();
  }, [handleExitOverlay, setViewMode]);
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
            {canExitOverlay &&
              !(editorOpen && viewMode === "notesList") && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="absolute top-4 right-4 z-10"
                  onClick={handleExitOverlay}
                  aria-label="Summarize and return to session"
                >
                  <Sigma className="size-5" />
                </Button>
              )}
            <div className="shrink-0 py-8 flex flex-col items-center gap-1">
              {breakRemainingMs != null &&
                breakRemainingMs > 0 &&
                !editorOpen && (
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
                  {editorOpen &&
                  activeSessionInWorkspace &&
                  viewMode === "notesList" ? (
                    <NoteBreadcrumb
                      projectName={activeSessionInWorkspace.projectName}
                      sessionName={activeSessionInWorkspace.session.title}
                      onProjectClick={handleBreadcrumbProjectClick}
                      onSessionClick={handleBreadcrumbSessionClick}
                      onFileClick={handleBreadcrumbFileClick}
                    />
                  ) : null}
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
      <Tutorial autoStart={!getTutorialCompleted()} onComplete={() => {}} />
      <div
        className="flex flex-1 min-w-0"
        inert={showOverlay || isExitingOverlay}
      >
        <SessionSidebar
          workspace={workspace}
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
          <div ref={mainContentRef} className="flex flex-1 min-h-0 flex-col">
            {viewMode === "notesList" ? (
              <NotesListPanel
                workspace={workspace}
                drill={notesListDrill}
                onDrillChange={setNotesListDrill}
                onSelectSession={(session) => {
                  setActiveSessionId(session._id);
                  if (session.projectId) setActiveProjectId(session.projectId);
                  else setActiveProjectId(null);
                  setNotesListDrill(
                    session.projectId
                      ? { type: "project", id: session.projectId }
                      : { type: "inbox" },
                  );
                  setEditorOpen(true);
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
                      {hasChatHistory ? (
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
                      ) : null}
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setEditorOpen(true)}
                        title="Open file"
                        aria-label="Open file"
                        data-tour="notes-btn"
                      >
                        <FileText className="size-5" />
                      </Button>
                    </div>
                  </header>
                )}
                {/* Past steps hide chat; cap graph height so card rows match the usual graph+input layout. */}
                <div
                  className={`flex w-full flex-1 min-h-0 items-stretch justify-stretch ${
                    !chatVisible ? "max-h-[calc(100dvh-13rem)]" : ""
                  }`}
                  data-tour="graph-area"
                >
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
              sessionId={activeSessionId}
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
              onLoadOlderMessages={
                canLoadOlderMessages ? () => loadOlderMessages(80) : undefined
              }
              canLoadOlderMessages={canLoadOlderMessages}
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
