import {
  useMemo,
  useCallback,
  useEffect,
  useState,
  useRef,
  type RefObject,
} from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSessionData } from "../../contexts/SessionDataContext";
import { useAppUiActor } from "../../hooks/useAppUi";
import { useAppContentSelectors } from "../../hooks/useAppContentSelectors";
import { useAppContentBodyHandlers } from "../../hooks/useAppContentBodyHandlers";
import {
  SessionSidebar,
  type ProjectWithSessions,
  type SessionSidebarHandle,
} from "../session-sidebar/SessionSidebar";
import { NotesListPanel } from "../notes-list/NotesListPanel";
import { Chat } from "../chat/Chat";
import { Tutorial, runTutorial } from "../onboarding/Tutorial";
import { getTutorialCompleted } from "@/lib/tutorialStorage";
import { ChatHistoryPanel } from "../chat/ChatHistoryPanel";
import { AppContentGraphSurface } from "./AppContentGraphSurface";
import { Toaster } from "../ui/sonner";
import {
  buildNumberedConceptsFromGraph,
  formatConceptPlainForClipboard,
  referencedConceptIdsFromDraft,
} from "../../lib/conceptReferences";
import { userInputForBatch, userMessageForBatch } from "../../lib/batchUserInput";
import { findSessionInWorkspace } from "../../lib/workspaceQueries";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import { WakeUpOverlay } from "../onboarding/WakeUpOverlay";
import { AppShell } from "./AppShell";
import {
  closeHistoryPanel,
  openEditor,
  openHistoryPanel,
  setChatLoading,
  setDraftInput,
  setGraphLoadingProgress,
  setNotesListDrill,
  setSelectedBatchIndex,
  setWakeNotes,
} from "@/lib/appUiCommands";

type AppContentBodyProps = {
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
    graphShowLoadingCards,
    graphInteractionBlocked,
    graphLoadingStartBatchLength,
    graphReferenceFreezeActive,
    editorOpen,
    historyPanelOpen,
    viewMode,
    displayWakeUpLayer,
    isExitingOverlay,
    chatLoadingOnGraphFrame,
    chatLoadingOnNotesList,
    editorRevealReady,
    hasChatHistory,
    uiCollapseSignal,
    overlayActionReturnsToGraph,
    showOverlayAction,
  } = useAppContentSelectors();
  const actor = useAppUiActor();
  const posthog = usePostHog();
  const prevCollapseSignalRef = useRef<string>("");
  const prevChatLoadingRef = useRef(false);

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
    handleBreadcrumbProjectsRootClick,
    handleBreadcrumbSessionClick,
    handleCardReferenceClick,
    handleWakeUpOverlayActionClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  } = useAppContentBodyHandlers({
    actor,
    draftInput,
  });
  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(conceptGraph, batches, selectedBatchIndex),
    [conceptGraph, batches, selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || selectedBatchIndex === batches.length - 1;
  const isPastBatchSelected = viewMode === "graph" && batches.length > 0 && !isLatestBatch;

  const batchUserPrompt = useMemo(
    () => userInputForBatch(batches, messages, selectedBatchIndex),
    [batches, messages, selectedBatchIndex],
  );

  const referenceSourceText = isLatestBatch ? draftInput : batchUserPrompt;
  const liveReferencedConceptIds = useMemo(
    () => referencedConceptIdsFromDraft(referenceSourceText, numberedConcepts),
    [referenceSourceText, numberedConcepts],
  );
  const [frozenReferencedConceptIds, setFrozenReferencedConceptIds] = useState<
    Set<string>
  >(new Set());
  const [loadingLockedReferencedConceptIds, setLoadingLockedReferencedConceptIds] =
    useState<Set<string> | null>(null);
  const previousGraphReferenceFreezeActiveRef = useRef(false);

  useEffect(() => {
    const wasFreezeActive = previousGraphReferenceFreezeActiveRef.current;
    if (graphReferenceFreezeActive && !wasFreezeActive) {
      // Freeze refs at request start so @n highlights stay pinned while new cards stream in.
      setFrozenReferencedConceptIds(new Set(liveReferencedConceptIds));
    }
    if (!graphReferenceFreezeActive && wasFreezeActive) {
      setFrozenReferencedConceptIds(new Set());
    }
    previousGraphReferenceFreezeActiveRef.current = graphReferenceFreezeActive;
  }, [graphReferenceFreezeActive, liveReferencedConceptIds]);

  useEffect(() => {
    if (!chatLoading) {
      setLoadingLockedReferencedConceptIds(null);
      return;
    }
    setLoadingLockedReferencedConceptIds((current) => {
      if (current != null) return current;
      return new Set(liveReferencedConceptIds);
    });
  }, [chatLoading, liveReferencedConceptIds]);

  useEffect(() => {
    if (!chatLoading) {
      setGraphLoadingProgress(actor, 0);
      return;
    }
    const graphNodes = conceptGraph?.nodes ?? [];
    const graphNodeIdSet = new Set(graphNodes.map((n) => n.id));
    const canTrackProgress = batches.length > graphLoadingStartBatchLength;
    if (!canTrackProgress) {
      setGraphLoadingProgress(actor, 0);
      return;
    }
    const latestBatch = batches[batches.length - 1];
    const latestBatchNodeCount =
      latestBatch?.nodeIds?.filter((id) => graphNodeIdSet.has(id)).length ?? 0;
    setGraphLoadingProgress(actor, latestBatchNodeCount);
  }, [actor, batches, chatLoading, conceptGraph, graphLoadingStartBatchLength]);

  const referencedConceptIds = useMemo(
    () => {
      if (loadingLockedReferencedConceptIds != null) {
        return loadingLockedReferencedConceptIds;
      }
      if (graphReferenceFreezeActive) {
        return frozenReferencedConceptIds;
      }
      return liveReferencedConceptIds;
    },
    [
      loadingLockedReferencedConceptIds,
      graphReferenceFreezeActive,
      frozenReferencedConceptIds,
      liveReferencedConceptIds,
    ],
  );

  const handleEditorOpen = useCallback(() => {
    posthog.capture("editor_opened");
    openEditor(actor);
  }, [actor, posthog]);

  const handleConceptCopy = useCallback(
    async (concept: { name: string; description?: string }) => {
      const text = formatConceptPlainForClipboard(concept);
      if (!text) {
        throw new Error("NO_CLIPBOARD_TEXT");
      }
      await navigator.clipboard.writeText(text);
      posthog.capture("concept_copied", { concept_name: concept.name });
      toast.success("Copied to clipboard");
    },
    [posthog],
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

  /** Imperative sidebar adapter — reacts to XState collapse tokens (delayed + immediate). */
  useEffect(() => {
    if (uiCollapseSignal === prevCollapseSignalRef.current) return;
    prevCollapseSignalRef.current = uiCollapseSignal;
    sessionSidebarRef.current?.collapse();
  }, [uiCollapseSignal, sessionSidebarRef]);

  useEffect(() => {
    const wasLoading = prevChatLoadingRef.current;
    if (chatLoading && !wasLoading) {
      sessionSidebarRef.current?.collapse();
    }
    prevChatLoadingRef.current = chatLoading;
  }, [chatLoading, sessionSidebarRef]);

  return (
    <AppShell
        wakeUpOverlay={
          displayWakeUpLayer ? (
            <WakeUpOverlay
              chatLoading={chatLoading}
              isExitingOverlay={isExitingOverlay}
              editorOpen={editorOpen}
              showOverlayAction={showOverlayAction}
              overlayActionReturnsToGraph={overlayActionReturnsToGraph}
              onOverlayActionClick={handleWakeUpOverlayActionClick}
              editorRevealReady={editorRevealReady}
              activeSessionId={activeSessionId}
              activeSessionInWorkspace={activeSessionInWorkspace}
              notes={notes}
              notesSelectionRange={null}
              onNotesChange={(v) => setWakeNotes(actor, v)}
              onBreadcrumbProjectsRootClick={handleBreadcrumbProjectsRootClick}
              onBreadcrumbProjectNameClick={handleBreadcrumbSessionClick}
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
          isDisabled={chatLoading}
        />
        <main
          className={clsx(
            "relative flex flex-1 flex-col min-w-0",
            (chatLoadingOnGraphFrame || chatLoadingOnNotesList) &&
              "rounded-md session-loading-inset-ring-pulse",
            !chatLoadingOnGraphFrame && !chatLoadingOnNotesList && isPastBatchSelected && "rounded-md",
          )}
          data-tour="main-content"
          aria-busy={
            chatLoadingOnGraphFrame || chatLoadingOnNotesList ? true : undefined
          }
        >
          {!chatLoadingOnGraphFrame && !chatLoadingOnNotesList && isPastBatchSelected ? (
            <div
              className="pointer-events-none absolute inset-0 z-20 rounded-md session-past-frame-overlay"
              aria-hidden
            />
          ) : null}
          {!chatLoadingOnGraphFrame && !chatLoadingOnNotesList && isPastBatchSelected ? (
            <div
              className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-[2px] w-[min(calc(100%-2rem),720px)] -translate-x-1/2 bg-background"
              aria-hidden
            />
          ) : null}
          <div
            ref={mainContentRef}
            className="relative flex flex-1 min-h-0 flex-col"
          >
            {viewMode === "notesList" ? (
              <NotesListPanel
                workspace={workspace}
                activeSessionId={activeSessionId}
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
                graphShowLoadingCards={graphShowLoadingCards}
                graphInteractionBlocked={graphInteractionBlocked}
                graphLoadingStartBatchLength={graphLoadingStartBatchLength}
                conceptGraph={conceptGraph}
                chatVisible={chatComposerVisible}
                referencedConceptIds={referencedConceptIds}
                onSelectBatch={(i) => setSelectedBatchIndex(actor, i)}
                onHistoryOpen={() => {
                  posthog.capture("chat_history_opened");
                  openHistoryPanel(actor);
                }}
                onEditorOpen={handleEditorOpen}
                onCardReferenceClick={
                  isLatestBatch ? handleCardReferenceClick : undefined
                }
                onConceptCopy={isLatestBatch ? handleConceptCopy : undefined}
              />
            )}
          </div>
          {chatComposerVisible && (
            <Chat
              sessionId={activeSessionId}
              sessionLoadingFrame={chatLoadingOnGraphFrame}
              sessionPastFrame={isPastBatchSelected}
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
