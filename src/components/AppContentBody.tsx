import {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionData } from "../contexts/SessionDataContext";
import { useAppUiActor } from "../hooks/useAppUi";
import { useAppContentSelectors } from "../hooks/useAppContentSelectors";
import { useAppContentBodyHandlers } from "../hooks/useAppContentBodyHandlers";
import {
  SessionSidebar,
  type ProjectWithSessions,
  type SessionSidebarHandle,
} from "./SessionSidebar";
import { NotesListPanel } from "./NotesListPanel";
import { Chat } from "./chat/Chat";
import { Tutorial, runTutorial } from "./Tutorial";
import { getTutorialCompleted } from "@/lib/tutorialStorage";
import { ChatHistoryPanel } from "./chat/ChatHistoryPanel";
import { AppContentGraphSurface } from "./AppContentGraphSurface";
import { Toaster } from "./ui/sonner";
import {
  buildNumberedConceptsFromGraph,
  formatReferenceConceptBullets,
  referencedConceptIdsFromDraft,
} from "../lib/conceptReferences";
import { userInputForBatch, userMessageForBatch } from "../lib/batchUserInput";
import { findSessionInWorkspace } from "../lib/workspaceQueries";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import { WakeUpOverlay } from "./WakeUpOverlay";
import { AppShell } from "./AppShell";
import {
  closeHistoryPanel,
  openEditor,
  openHistoryPanel,
  setChatLoading,
  setDraftInput,
  setNotesListDrill,
  setSelectedBatchIndex,
  setTopAppTarget,
  setWakeNotes,
} from "@/lib/appUiCommands";

export type AppContentBodyProps = {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: RefObject<HTMLDivElement | null>;
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
};

type AppendedRange = {
  start: number;
  end: number;
};

function appendToNotesEnd(
  currentNotes: string,
  addition: string,
): { text: string; appendedRange: AppendedRange | null } {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) {
    return { text: currentNotes, appendedRange: null };
  }
  if (!currentNotes.trim()) {
    return { text: trimmedAddition, appendedRange: { start: 0, end: trimmedAddition.length } };
  }
  const separator = currentNotes.endsWith("\n\n") ? "" : "\n\n";
  const start = currentNotes.length + separator.length;
  const text = `${currentNotes}${separator}${trimmedAddition}`;
  return { text, appendedRange: { start, end: text.length } };
}

export function AppContentBody({
  onCreateSessionForFirstMessage,
  workspace,
  mainContentRef,
  sessionSidebarRef,
}: AppContentBodyProps) {
  const {
    activeSessionId,
    activeProjectId,
    notesListDrill,
    showFileNoteBreadcrumbFromProjectNotes,
    selectedBatchIndex,
    draftInput,
    notes,
    chatLoading,
    editorOpen,
    historyPanelOpen,
    viewMode,
    displayWakeUpLayer,
    isExitingOverlay,
    chatLoadingOnGraphFrame,
    chatLoadingOnNotesList,
    editorRevealReady,
    hasChatHistory,
    topAppTarget,
    uiCollapseSignal,
    sigmaEditorFromSession,
    showOverlaySigma,
  } = useAppContentSelectors();
  const actor = useAppUiActor();
  const prevCollapseSignalRef = useRef<string>("");

  const activeSessionInWorkspace = useMemo(
    () => findSessionInWorkspace(workspace, activeSessionId),
    [workspace, activeSessionId],
  );

  const {
    conceptGraph,
    messages,
    batches,
    loadOlderMessages,
    canLoadOlderMessages,
  } = useSessionData();

  const {
    setViewMode,
    handleBreadcrumbProjectClick,
    handleBreadcrumbSessionClick,
    handleBreadcrumbFileClick,
    handleCardReferenceClick,
    handleWakeUpSigmaClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  } = useAppContentBodyHandlers({
    actor,
    draftInput,
  });
  const [copySelectedConceptIds, setCopySelectedConceptIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [notesSelectionRange, setNotesSelectionRange] = useState<AppendedRange | null>(
    null,
  );

  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(conceptGraph, batches, selectedBatchIndex),
    [conceptGraph, batches, selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || selectedBatchIndex === batches.length - 1;

  useEffect(() => {
    setCopySelectedConceptIds(new Set());
  }, [activeSessionId, selectedBatchIndex]);

  const batchUserPrompt = useMemo(
    () => userInputForBatch(batches, messages, selectedBatchIndex),
    [batches, messages, selectedBatchIndex],
  );

  const referenceSourceText = isLatestBatch ? draftInput : batchUserPrompt;

  const referencedConceptIds = useMemo(
    () => referencedConceptIdsFromDraft(referenceSourceText, numberedConcepts),
    [referenceSourceText, numberedConcepts],
  );

  const handleEditorOpen = useCallback(() => {
    const selectedConcepts = numberedConcepts
      .filter((concept) => copySelectedConceptIds.has(concept.id))
      .map((concept) => ({
        number: concept.number,
        name: concept.name,
        description: concept.description,
      }));
    const clipboardPayload = formatReferenceConceptBullets(selectedConcepts);
    openEditor(actor);
    setCopySelectedConceptIds(new Set());
    if (!clipboardPayload) {
      setNotesSelectionRange(null);
      return;
    }
    const appended = appendToNotesEnd(notes, clipboardPayload);
    setWakeNotes(actor, appended.text);
    setNotesSelectionRange(appended.appendedRange);
    toast.success(
      selectedConcepts.length === 1 ? "concept inserted" : "concepts inserted",
    );
  }, [actor, copySelectedConceptIds, notes, numberedConcepts]);

  const handleCardCopySelectToggle = useCallback((conceptId: string) => {
    setCopySelectedConceptIds((previous) => {
      const next = new Set(previous);
      if (next.has(conceptId)) {
        next.delete(conceptId);
      } else {
        next.add(conceptId);
      }
      return next;
    });
  }, []);

  /** Composer stays visible in graph mode even when the stepper is on an earlier batch. */
  const chatComposerVisible = viewMode === "graph";

  const lockedHistorical = useMemo(() => {
    if (isLatestBatch || batches.length === 0) return null;
    const msg = userMessageForBatch(batches, messages, selectedBatchIndex);
    if (msg) {
      return { content: msg.content, mentions: msg.mentions };
    }
    return { content: batchUserPrompt, mentions: undefined };
  }, [isLatestBatch, batches, messages, selectedBatchIndex, batchUserPrompt]);

  /** Imperative sidebar adapter — reacts to XState collapse tokens (delayed + immediate). */
  useEffect(() => {
    if (uiCollapseSignal === prevCollapseSignalRef.current) return;
    prevCollapseSignalRef.current = uiCollapseSignal;
    sessionSidebarRef.current?.collapse();
  }, [uiCollapseSignal, sessionSidebarRef]);

  return (
    <AppShell
        wakeUpOverlay={
          displayWakeUpLayer ? (
            <WakeUpOverlay
              chatLoading={chatLoading}
              isExitingOverlay={isExitingOverlay}
              editorOpen={editorOpen}
              showOverlaySigma={showOverlaySigma}
              sigmaEditorFromSession={sigmaEditorFromSession}
              onSigmaClick={handleWakeUpSigmaClick}
              editorRevealReady={editorRevealReady}
              activeSessionId={activeSessionId}
              activeSessionInWorkspace={activeSessionInWorkspace}
              showFileNoteBreadcrumbFromProjectNotes={
                showFileNoteBreadcrumbFromProjectNotes
              }
              notes={notes}
              notesSelectionRange={notesSelectionRange}
              onNotesChange={(v) => setWakeNotes(actor, v)}
              onBreadcrumbProjectClick={handleBreadcrumbProjectClick}
              onBreadcrumbSessionClick={handleBreadcrumbSessionClick}
              onBreadcrumbFileClick={handleBreadcrumbFileClick}
              topAppTarget={topAppTarget}
              onTopAppTargetChange={(target) => setTopAppTarget(actor, target)}
            />
          ) : null
        }
        tutorial={<Tutorial autoStart={!getTutorialCompleted()} />}
        mainInert={!!displayWakeUpLayer}
        toaster={<Toaster theme="dark" />}
      >
        <SessionSidebar
          ref={sessionSidebarRef}
          workspace={workspace}
          activeSessionId={activeSessionId}
          activeProjectId={activeProjectId}
          onSelectSession={onSelectSessionFromSidebar}
          onSelectProject={onSelectProjectFromSidebar}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRunTutorial={runTutorial}
        />
        <main
          className={clsx(
            "relative flex flex-1 flex-col min-w-0",
            (chatLoadingOnGraphFrame || chatLoadingOnNotesList) &&
              "rounded-md session-loading-inset-ring-pulse",
          )}
          data-tour="main-content"
          aria-busy={
            chatLoadingOnGraphFrame || chatLoadingOnNotesList ? true : undefined
          }
        >
          <div
            ref={mainContentRef}
            className="relative flex flex-1 min-h-0 flex-col"
          >
            {viewMode === "notesList" ? (
              <NotesListPanel
                workspace={workspace}
                drill={notesListDrill}
                onDrillChange={(drill) => setNotesListDrill(actor, drill)}
                onSelectSession={onSelectSessionFromNotesList}
              />
            ) : (
              <AppContentGraphSurface
                sessionSidebarRef={sessionSidebarRef}
                activeSessionId={activeSessionId}
                activeSessionTitle={activeSessionInWorkspace?.session.title}
                batchesLength={batches.length}
                selectedBatchIndex={selectedBatchIndex}
                hasChatHistory={hasChatHistory}
                chatLoading={chatLoading}
                conceptGraph={conceptGraph}
                chatVisible={chatComposerVisible}
                referencedConceptIds={referencedConceptIds}
                onSelectBatch={(i) => setSelectedBatchIndex(actor, i)}
                onHistoryOpen={() => openHistoryPanel(actor)}
                onEditorOpen={handleEditorOpen}
                onCardReferenceClick={
                  isLatestBatch ? handleCardReferenceClick : undefined
                }
                onCardCopySelectToggle={
                  isLatestBatch ? handleCardCopySelectToggle : undefined
                }
                copySelectedConceptIds={copySelectedConceptIds}
              />
            )}
          </div>
          {chatComposerVisible && (
            <Chat
              sessionId={activeSessionId}
              sessionLoadingFrame={chatLoadingOnGraphFrame}
              autoCollapseSignal={uiCollapseSignal}
              isLoading={chatLoading}
              setIsLoading={(loading) => setChatLoading(actor, loading)}
              numberedConcepts={numberedConcepts}
              draftInput={draftInput}
              setDraftInput={(v) => setDraftInput(actor, v)}
              onCreateSession={onCreateSessionForFirstMessage}
              lockedHistorical={lockedHistorical}
              selectedBatchIndex={selectedBatchIndex}
            />
          )}
          {viewMode === "graph" && (
            <ChatHistoryPanel
              isOpen={historyPanelOpen}
              onClose={() => closeHistoryPanel(actor)}
              messages={messages ?? []}
              onLoadOlderMessages={
                canLoadOlderMessages
                  ? () => loadOlderMessages(CHAT_MESSAGES_PAGE_SIZE)
                  : undefined
              }
              canLoadOlderMessages={canLoadOlderMessages}
              batches={batches}
              selectedBatchIndex={selectedBatchIndex}
              onNavigateToStep={(batchIndex: number) => {
                setSelectedBatchIndex(actor, batchIndex);
                closeHistoryPanel(actor);
              }}
            />
          )}
        </main>
      </AppShell>
  );
}
