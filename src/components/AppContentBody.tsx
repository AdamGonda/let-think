import { useMemo, useCallback, type RefObject } from "react";
import { clsx } from "clsx";
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
  referencedConceptIdsFromDraft,
} from "../lib/conceptReferences";
import { userInputForBatch, userMessageForBatch } from "../lib/batchUserInput";
import { findSessionInWorkspace } from "../lib/workspaceQueries";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import { WakeUpOverlay } from "./WakeUpOverlay";
import { RestSessionWalkthrough } from "./RestSessionWalkthrough";
import { AppShell } from "./AppShell";
import { markRestWalkthroughDoneForSession } from "@/lib/restSessionWalkthroughStorage";
import {
  closeHistoryPanel,
  completeRestWalkthroughUi,
  notifyModelFinished,
  openEditor,
  openHistoryPanel,
  setChatLoading,
  setDraftInput,
  setNotesListDrill,
  setSelectedBatchIndex,
  setWakeNotes,
} from "@/lib/appUiCommands";

export type AppContentBodyProps = {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: RefObject<HTMLDivElement | null>;
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
};

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
    selectedBatchIndex,
    draftInput,
    notes,
    chatLoading,
    editorOpen,
    historyPanelOpen,
    viewMode,
    displayWakeUpLayer,
    isExitingOverlay,
    workModeSessionLoading,
    workModeNotesListDuringChatLoading,
    isWorkMode,
    canExitOverlay,
    editorRevealReady,
    showRestSessionWalkthrough,
    hasChatHistory,
  } = useAppContentSelectors();
  const actor = useAppUiActor();

  const activeSessionInWorkspace = useMemo(
    () => findSessionInWorkspace(workspace, activeSessionId),
    [workspace, activeSessionId],
  );

  const {
    conceptGraph,
    messages,
    batches,
    breakRemainingMs,
    loadOlderMessages,
    canLoadOlderMessages,
  } = useSessionData();

  const {
    setViewMode,
    handleBreadcrumbProjectClick,
    handleBreadcrumbSessionClick,
    handleBreadcrumbFileClick,
    handleCardReferenceClick,
    workSigmaEditorFromSession,
    showOverlaySigma,
    handleWakeUpSigmaClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  } = useAppContentBodyHandlers({
    actor,
    draftInput,
    activeSessionInWorkspace,
    sessionSidebarRef,
    canExitOverlay,
    editorOpen,
    viewMode,
    isWorkMode,
  });

  const handleRestWalkthroughComplete = useCallback(() => {
    if (activeSessionId) {
      markRestWalkthroughDoneForSession(activeSessionId);
    }
    completeRestWalkthroughUi(actor);
  }, [actor, activeSessionId]);

  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(conceptGraph, batches, selectedBatchIndex),
    [conceptGraph, batches, selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || selectedBatchIndex === batches.length - 1;

  const batchUserPrompt = useMemo(
    () => userInputForBatch(batches, messages, selectedBatchIndex),
    [batches, messages, selectedBatchIndex],
  );

  const referenceSourceText = isLatestBatch ? draftInput : batchUserPrompt;

  const referencedConceptIds = useMemo(
    () => referencedConceptIdsFromDraft(referenceSourceText, numberedConcepts),
    [referenceSourceText, numberedConcepts],
  );

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

  return (
    <AppShell
      wakeUpOverlay={
        displayWakeUpLayer ? (
          <WakeUpOverlay
            chatLoading={chatLoading}
            isExitingOverlay={isExitingOverlay}
            breakRemainingMs={breakRemainingMs}
            editorOpen={editorOpen}
            showOverlaySigma={showOverlaySigma}
            workSigmaEditorFromSession={workSigmaEditorFromSession}
            onSigmaClick={handleWakeUpSigmaClick}
            editorRevealReady={editorRevealReady}
            activeSessionId={activeSessionId}
            activeSessionInWorkspace={activeSessionInWorkspace}
            viewMode={viewMode}
            notes={notes}
            onNotesChange={(v) => setWakeNotes(actor, v)}
            onBreadcrumbProjectClick={handleBreadcrumbProjectClick}
            onBreadcrumbSessionClick={handleBreadcrumbSessionClick}
            onBreadcrumbFileClick={handleBreadcrumbFileClick}
          />
        ) : null
      }
      restSessionWalkthrough={
        showRestSessionWalkthrough ? (
          <RestSessionWalkthrough
            key={activeSessionId ?? undefined}
            onComplete={handleRestWalkthroughComplete}
          />
        ) : null
      }
      tutorial={<Tutorial autoStart={!getTutorialCompleted()} />}
      mainInert={!!displayWakeUpLayer || showRestSessionWalkthrough}
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
          "flex flex-1 flex-col min-w-0",
          (workModeSessionLoading || workModeNotesListDuringChatLoading) &&
            "rounded-md session-loading-inset-ring-pulse",
        )}
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
              onEditorOpen={() => openEditor(actor)}
              onCardReferenceClick={
                isLatestBatch ? handleCardReferenceClick : undefined
              }
            />
          )}
        </div>
        {chatComposerVisible && (
          <Chat
            sessionId={activeSessionId}
            workModeLoadingFrame={workModeSessionLoading}
            isLoading={chatLoading}
            setIsLoading={(loading) => setChatLoading(actor, loading)}
            onModelResponded={() => notifyModelFinished(actor)}
            numberedConcepts={numberedConcepts}
            draftInput={draftInput}
            setDraftInput={(v) => setDraftInput(actor, v)}
            onCreateSession={onCreateSessionForFirstMessage}
            lockedHistorical={lockedHistorical}
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
