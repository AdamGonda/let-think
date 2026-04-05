import { useMemo, useRef, useCallback } from "react";
import {
  useQuery,
  AuthLoading,
  Unauthenticated,
  Authenticated,
} from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  SessionDataProvider,
  useSessionData,
} from "./contexts/SessionDataContext";
import { AppUiProvider } from "./contexts/AppUiProvider";
import { useAppUiActor, useAppUiSelector } from "./hooks/useAppUi";
import {
  SessionSidebar,
  type ProjectWithSessions,
  type SessionSidebarHandle,
} from "./components/SessionSidebar";
import { NotesListPanel } from "./components/NotesListPanel";
import { Chat } from "./components/Chat";
import {
  Tutorial,
  runTutorial,
  getTutorialCompleted,
} from "./components/Tutorial";
import { ChatHistoryPanel } from "./components/ChatHistoryPanel";
import { ConceptGraphOverlay } from "./components/ConceptGraphOverlay";
import { SignIn } from "./components/SignIn";
import { Toaster } from "./components/ui/sonner";
import { WorkPreferenceSync } from "./components/WorkPreferenceSync";
import {
  selectCanExitWakeUp,
  selectDisplayWakeUpLayer,
  selectEditorRevealReady,
  selectIsExitingWakeUp,
  selectIsWorkMode,
  selectShowRestSessionWalkthrough,
  selectSurface,
  selectWorkModeNotesListDuringChatLoading,
  selectWorkModeSessionLoading,
} from "./machines/appUiMachine";
import { AppUiSessionBridge } from "./bridge/AppUiSessionBridge";
import { useSessionEditorSync } from "./hooks/useSessionEditorSync";
import { useDefaultSessionSelection } from "./hooks/useDefaultSessionSelection";
import {
  buildNumberedConceptsFromGraph,
  referencedConceptIdsFromDraft,
} from "./lib/conceptReferences";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import { WakeUpOverlay } from "./components/WakeUpOverlay";
import { RestSessionWalkthrough } from "./components/RestSessionWalkthrough";
import { GraphViewHeader } from "./components/GraphViewHeader";
import { AppShell } from "./components/AppShell";
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
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const { handleCreateSessionForFirstMessage } = useDefaultSessionSelection();
  useSessionEditorSync(activeSessionId);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sessionSidebarRef = useRef<SessionSidebarHandle>(null);

  return (
    <>
      <WorkPreferenceSync />
      <SessionDataProvider sessionId={activeSessionId}>
        <AppUiSessionBridge
          workspace={projectsWithSessions}
          activeSessionId={activeSessionId}
        >
          <AppContentBody
            onCreateSessionForFirstMessage={
              !activeSessionId ? handleCreateSessionForFirstMessage : undefined
            }
            workspace={projectsWithSessions}
            mainContentRef={mainContentRef}
            sessionSidebarRef={sessionSidebarRef}
          />
        </AppUiSessionBridge>
      </SessionDataProvider>
    </>
  );
}

function AppContentBody({
  onCreateSessionForFirstMessage,
  workspace,
  mainContentRef,
  sessionSidebarRef,
}: {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  sessionSidebarRef: React.RefObject<SessionSidebarHandle | null>;
}) {
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const activeProjectId = useAppUiSelector((s) => s.context.activeProjectId);
  const notesListDrill = useAppUiSelector((s) => s.context.notesListDrill);
  const selectedBatchIndex = useAppUiSelector(
    (s) => s.context.selectedBatchIndex,
  );
  const draftInput = useAppUiSelector((s) => s.context.draftInput);
  const notes = useAppUiSelector((s) => s.context.notes);
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
  const editorRevealReady = useAppUiSelector(selectEditorRevealReady);
  const showRestSessionWalkthrough = useAppUiSelector(
    selectShowRestSessionWalkthrough,
  );
  const hasChatHistory = useAppUiSelector((s) => s.context.hasChatHistory);

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
  } = useSessionData();

  const handleRestWalkthroughComplete = useCallback(() => {
    actor.send({ type: "REST_WALKTHROUGH_COMPLETE" });
  }, [actor]);

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
      // Opening Files from the sidebar should always show the top-level project grid,
      // not a stale drill from a session opened earlier from the list.
      if (mode === "notesList") {
        actor.send({ type: "NOTES_LIST_DRILL_SET", drill: null });
      }
      actor.send({ type: "VIEW_SET", mode });
    },
    [actor],
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
    if (activeSessionInWorkspace.projectId) {
      actor.send({
        type: "ACTIVE_PROJECT_SET",
        projectId: activeSessionInWorkspace.projectId,
      });
      actor.send({
        type: "NOTES_LIST_DRILL_SET",
        drill: {
          type: "project",
          id: activeSessionInWorkspace.projectId,
        },
      });
    } else {
      actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
      actor.send({ type: "NOTES_LIST_DRILL_SET", drill: { type: "inbox" } });
    }
    handleExitOverlay();
  }, [activeSessionInWorkspace, handleExitOverlay, actor]);

  const handleBreadcrumbFileClick = useCallback(() => {
    handleReturnToGraphFromEditorOverlay();
  }, [handleReturnToGraphFromEditorOverlay]);

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
      tutorial={
        <Tutorial autoStart={!getTutorialCompleted()} onComplete={() => {}} />
      }
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
              onSelectSession={(session) => {
                actor.send({
                  type: "ACTIVE_SESSION_SET",
                  sessionId: session._id,
                });
                if (session.projectId) {
                  actor.send({
                    type: "ACTIVE_PROJECT_SET",
                    projectId: session.projectId,
                  });
                } else {
                  actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
                }
                actor.send({
                  type: "NOTES_LIST_DRILL_SET",
                  drill: session.projectId
                    ? { type: "project", id: session.projectId }
                    : { type: "inbox" },
                });
                actor.send({ type: "EDITOR_OPEN" });
              }}
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

export default App;
