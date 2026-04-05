import { useMemo, useCallback, type RefObject } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionData } from "../contexts/SessionDataContext";
import { useAppUiActor } from "../hooks/useAppUi";
import { useAppContentSelectors } from "../hooks/useAppContentSelectors";
import {
  SessionSidebar,
  type ProjectWithSessions,
  type SessionSidebarHandle,
} from "./SessionSidebar";
import { NotesListPanel } from "./NotesListPanel";
import { Chat } from "./Chat";
import { Tutorial, runTutorial, getTutorialCompleted } from "./Tutorial";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import { ConceptGraphOverlay } from "./ConceptGraphOverlay";
import { Toaster } from "./ui/sonner";
import {
  buildNumberedConceptsFromGraph,
  referencedConceptIdsFromDraft,
  toggleAtReferenceInDraft,
} from "../lib/conceptReferences";
import {
  navigateDrillToSessionContext,
  openSessionInFilesWithEditor,
} from "../lib/appUiCommands";
import { findSessionInWorkspace } from "../lib/workspaceQueries";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import { WakeUpOverlay } from "./WakeUpOverlay";
import { RestSessionWalkthrough } from "./RestSessionWalkthrough";
import { GraphViewHeader } from "./GraphViewHeader";
import { AppShell } from "./AppShell";

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

  const handleRestWalkthroughComplete = useCallback(() => {
    actor.send({ type: "REST_WALKTHROUGH_COMPLETE" });
  }, [actor]);

  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      actor.send({
        type: "DRAFT_INPUT_SET",
        value: toggleAtReferenceInDraft(draftInput, conceptNumber),
      });
      setTimeout(() => {
        document
          .querySelector<HTMLTextAreaElement>("[data-session-input-textarea]")
          ?.focus();
      }, 0);
    },
    [actor, draftInput],
  );

  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(conceptGraph, batches, selectedBatchIndex),
    [conceptGraph, batches, selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length > 0 && selectedBatchIndex === batches.length - 1;
  const referencedConceptIds = useMemo(
    () =>
      referencedConceptIdsFromDraft(
        draftInput,
        numberedConcepts,
        isLatestBatch,
      ),
    [draftInput, numberedConcepts, isLatestBatch],
  );

  const chatVisible =
    viewMode === "graph" &&
    (batches.length === 0 || selectedBatchIndex === batches.length - 1);

  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      if (mode === "notesList") {
        if (activeSessionInWorkspace?.projectId) {
          navigateDrillToSessionContext(
            actor,
            activeSessionInWorkspace.projectId,
          );
        } else {
          actor.send({ type: "NOTES_LIST_DRILL_SET", drill: null });
        }
      }
      actor.send({ type: "VIEW_SET", mode });
    },
    [actor, activeSessionInWorkspace],
  );

  const handleExitOverlay = useCallback(() => {
    if (!canExitOverlay) return;
    actor.send({ type: "USER_EXIT_WAKE_UP" });
  }, [canExitOverlay, actor]);

  const handleReturnToGraphFromEditorOverlay = useCallback(() => {
    setViewMode("graph");
    actor.send({ type: "EDITOR_CLOSE" });
  }, [setViewMode, actor]);

  const handleBreadcrumbProjectClick = useCallback(() => {
    actor.send({ type: "NOTES_LIST_DRILL_SET", drill: null });
    handleExitOverlay();
  }, [handleExitOverlay, actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    if (!activeSessionInWorkspace) return;
    navigateDrillToSessionContext(
      actor,
      activeSessionInWorkspace.projectId,
    );
    handleExitOverlay();
  }, [activeSessionInWorkspace, handleExitOverlay, actor]);

  const handleBreadcrumbFileClick = useCallback(() => {
    handleReturnToGraphFromEditorOverlay();
    sessionSidebarRef.current?.expand();
  }, [handleReturnToGraphFromEditorOverlay, sessionSidebarRef]);

  const workSigmaEditorFromSession =
    isWorkMode && editorOpen && viewMode === "graph";
  const overlaySigmaStandardExit =
    canExitOverlay && !(editorOpen && viewMode === "notesList");
  const showOverlaySigma =
    workSigmaEditorFromSession || overlaySigmaStandardExit;

  const handleWakeUpSigmaClick = useCallback(() => {
    if (workSigmaEditorFromSession) {
      handleReturnToGraphFromEditorOverlay();
    } else {
      handleExitOverlay();
    }
  }, [
    workSigmaEditorFromSession,
    handleReturnToGraphFromEditorOverlay,
    handleExitOverlay,
  ]);

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
            onNotesChange={(v) => actor.send({ type: "NOTES_SET", value: v })}
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
        onSelectSession={(id) => {
          actor.send({ type: "ACTIVE_SESSION_SET", sessionId: id });
          if (viewMode === "notesList") setViewMode("graph");
        }}
        onSelectProject={(id) =>
          actor.send({ type: "ACTIVE_PROJECT_SET", projectId: id })
        }
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
            <NotesListPanel
              workspace={workspace}
              drill={notesListDrill}
              onDrillChange={(drill) =>
                actor.send({ type: "NOTES_LIST_DRILL_SET", drill })
              }
              onSelectSession={(session) =>
                openSessionInFilesWithEditor(actor, session)
              }
            />
          ) : (
            <>
              {activeSessionId && (
                <GraphViewHeader
                  sessionTitle={activeSessionInWorkspace?.session.title}
                  batchCount={batches.length}
                  selectedBatchIndex={selectedBatchIndex}
                  onSelectBatch={(i) =>
                    actor.send({ type: "SELECTED_BATCH_INDEX_SET", index: i })
                  }
                  hasChatHistory={hasChatHistory}
                  onHistoryOpen={() => actor.send({ type: "HISTORY_OPEN" })}
                  onEditorOpen={() => actor.send({ type: "EDITOR_OPEN" })}
                  onSessionTitleClick={() =>
                    sessionSidebarRef.current?.expand()
                  }
                />
              )}
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
                  onSelectedBatchIndexChange={(i) =>
                    actor.send({ type: "SELECTED_BATCH_INDEX_SET", index: i })
                  }
                  referencedConceptIds={referencedConceptIds}
                  onCardReferenceClick={
                    chatVisible ? handleCardReferenceClick : undefined
                  }
                />
              </div>
            </>
          )}
        </div>
        {chatVisible && (
          <Chat
            sessionId={activeSessionId}
            workModeLoadingFrame={workModeSessionLoading}
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
            setDraftInput={(v) =>
              actor.send({ type: "DRAFT_INPUT_SET", value: v })
            }
            onCreateSession={onCreateSessionForFirstMessage}
          />
        )}
        {viewMode === "graph" && (
          <ChatHistoryPanel
            isOpen={historyPanelOpen}
            onClose={() => actor.send({ type: "HISTORY_CLOSE" })}
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
              actor.send({
                type: "SELECTED_BATCH_INDEX_SET",
                index: batchIndex,
              });
              actor.send({ type: "HISTORY_CLOSE" });
            }}
          />
        )}
      </main>
    </AppShell>
  );
}
