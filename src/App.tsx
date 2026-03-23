import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useAtom } from "jotai";
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
import { AppUiProvider } from "./contexts/AppUiProvider";
import { useAppUiActor, useAppUiSelector } from "./hooks/useAppUi";
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
  selectCanExitWakeUp,
  selectDisplayWakeUpLayer,
  selectIsExitingWakeUp,
  selectIsWorkMode,
  selectSurface,
  selectWorkModeNotesListDuringChatLoading,
  selectWorkModeSessionLoading,
} from "./machines/appUiMachine";
import {
  activeSessionIdAtom,
  activeProjectIdAtom,
  draftInputAtom,
  notesAtom,
  notesListDrillAtom,
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
        <AppUiProvider>
          <AppContent />
        </AppUiProvider>
      </Authenticated>
    </>
  );
}

function AppContent() {
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveProjectId] = useAtom(activeProjectIdAtom);
  const [draftInput, setDraftInput] = useAtom(draftInputAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const actor = useAppUiActor();

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
    actor.send({ type: "SESSION_SYNC", active: activeSessionId != null });
  }, [activeSessionId, actor]);

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
  const [notesListDrill, setNotesListDrill] = useAtom(notesListDrillAtom);
  const [selectedBatchIndex, setSelectedBatchIndex] = useAtom(
    selectedBatchIndexAtom,
  );
  const [draftInput, setDraftInput] = useAtom(draftInputAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const actor = useAppUiActor();

  const chatLoading = useAppUiSelector((s) => s.context.chatLoading);
  const editorOpen = useAppUiSelector((s) => s.context.editorOpen);
  const historyPanelOpen = useAppUiSelector((s) => s.context.historyPanelOpen);
  const viewMode = useAppUiSelector(selectSurface);

  const displayWakeUpLayer = useAppUiSelector(selectDisplayWakeUpLayer);
  const isExitingOverlay = useAppUiSelector(selectIsExitingWakeUp);
  const workModeSessionLoading = useAppUiSelector(selectWorkModeSessionLoading);
  const workModeNotesListDuringChatLoading = useAppUiSelector(
    selectWorkModeNotesListDuringChatLoading,
  );
  const isWorkMode = useAppUiSelector(selectIsWorkMode);
  const canExitOverlay = useAppUiSelector(selectCanExitWakeUp);

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
    if (!hasChatHistory) actor.send({ type: "HISTORY_CLOSE" });
  }, [
    historyPanelOpen,
    activeSessionId,
    messagesLoading,
    hasChatHistory,
    actor,
  ]);
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;

  useEffect(() => {
    actor.send({ type: "BREAK_CHANGED", inBreak: isInBreak });
  }, [isInBreak, actor]);

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

  const chatVisible =
    viewMode === "graph" &&
    (batches.length === 0 || selectedBatchIndex === batches.length - 1);

  // Delay revealing the editor until after it has rendered and scrolled to caret
  const [editorRevealReady, setEditorRevealReady] = useState(false);
  useEffect(() => {
    if (!displayWakeUpLayer || isExitingOverlay) {
      queueMicrotask(() => setEditorRevealReady(false));
      return;
    }
    const id = setTimeout(() => setEditorRevealReady(true), 50);
    return () => clearTimeout(id);
  }, [displayWakeUpLayer, isExitingOverlay]);

  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      actor.send({ type: "VIEW_SET", mode });
    },
    [actor],
  );

  const handleExitOverlay = useCallback(() => {
    if (!canExitOverlay) return;
    actor.send({ type: "USER_EXIT_WAKE_UP" });
  }, [canExitOverlay, actor]);

  /** Close file editor overlay and return to graph — works while LLM is loading (unlike USER_EXIT_WAKE_UP). */
  const handleReturnToGraphFromEditorOverlay = useCallback(() => {
    setViewMode("graph");
    actor.send({ type: "EDITOR_CLOSE" });
  }, [setViewMode, actor]);

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
    handleReturnToGraphFromEditorOverlay();
  }, [handleReturnToGraphFromEditorOverlay]);

  /** Open file from graph keeps `viewMode === "graph"`; picking a session in Files keeps `notesList`. */
  const workSigmaEditorFromSession =
    isWorkMode && editorOpen && viewMode === "graph";
  const overlaySigmaStandardExit =
    canExitOverlay && !(editorOpen && viewMode === "notesList");
  const showOverlaySigma =
    workSigmaEditorFromSession || overlaySigmaStandardExit;

  return (
    <div className="flex h-screen bg-background">
      {displayWakeUpLayer && (
        <div
          className={`fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-background ${
            isExitingOverlay ? "animate-wake-up-out" : "animate-wake-up-in"
          }`}
          aria-busy={chatLoading}
          aria-live="polite"
        >
          {/* Hide overlay content immediately when exiting to avoid text/cards overlap during fade */}
          <div
            className={`flex flex-1 min-h-0 flex-col transition-opacity duration-75 ${
              isExitingOverlay ? "opacity-0" : "opacity-100"
            }`}
          >
            {showOverlaySigma ? (
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute top-4 right-4 z-10"
                onClick={
                  workSigmaEditorFromSession
                    ? handleReturnToGraphFromEditorOverlay
                    : handleExitOverlay
                }
                aria-label={
                  workSigmaEditorFromSession
                    ? "Return to concept graph"
                    : "Summarize and return to session"
                }
              >
                <Sigma className="size-5" />
              </Button>
            ) : null}
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
        inert={displayWakeUpLayer}
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
        <main
          className={`flex flex-1 flex-col min-w-0${
            workModeSessionLoading || workModeNotesListDuringChatLoading
              ? " rounded-md ring-2 ring-(--session-accent) ring-inset"
              : ""
          }`}
          data-tour="main-content"
          aria-busy={
            workModeSessionLoading || workModeNotesListDuringChatLoading
              ? true
              : undefined
          }
        >
          <div
            ref={mainContentRef}
            className="relative flex flex-1 min-h-0 flex-col"
          >
            {viewMode === "notesList" ? (
              <>
                {workModeNotesListDuringChatLoading ? (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute top-4 right-4 z-10"
                    onClick={() => setViewMode("graph")}
                    title="Return to graph"
                    aria-label="Return to concept graph"
                  >
                    <Sigma className="size-5" />
                  </Button>
                ) : null}
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
                    actor.send({ type: "EDITOR_OPEN" });
                  }}
                />
              </>
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
                          onClick={() => actor.send({ type: "HISTORY_OPEN" })}
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
                        onClick={() => actor.send({ type: "EDITOR_OPEN" })}
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
                    isLoading={chatLoading}
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
              isLoading={chatLoading}
              setIsLoading={(loading) =>
                actor.send(
                  loading
                    ? { type: "CHAT_LOADING_START" }
                    : { type: "CHAT_LOADING_END" },
                )
              }
              onModelResponded={() => actor.send({ type: "MODEL_FINISHED" })}
              numberedConcepts={numberedConcepts}
              draftInput={draftInput}
              setDraftInput={setDraftInput}
              onCreateSession={onCreateSessionForFirstMessage}
            />
          )}
          {viewMode === "graph" && (
            <ChatHistoryPanel
              isOpen={historyPanelOpen}
              onClose={() => actor.send({ type: "HISTORY_CLOSE" })}
              messages={messages ?? []}
              onLoadOlderMessages={
                canLoadOlderMessages ? () => loadOlderMessages(80) : undefined
              }
              canLoadOlderMessages={canLoadOlderMessages}
              batches={batches}
              selectedBatchIndex={selectedBatchIndex}
              onNavigateToStep={(batchIndex: number) => {
                setSelectedBatchIndex(batchIndex);
                actor.send({ type: "HISTORY_CLOSE" });
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
