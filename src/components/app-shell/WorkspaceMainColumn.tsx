import { useMemo, type RefObject } from "react";
import { clsx } from "clsx";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useSessionData } from "../../contexts/SessionDataContext";
import type { SessionMessage } from "../../contexts/SessionDataContext";
import { useAppUiActor } from "../../hooks/useAppUi";
import { useChatDockMachineSelectors } from "../../hooks/useAppShellMachineSelectors";
import type { AppLayoutSelectors } from "../../hooks/useAppShellMachineSelectors";
import { Chat } from "../chat/Chat";
import { ChatHistoryPanel } from "../chat/ChatHistoryPanel";
import { NotesListPanel } from "../notes-list/NotesListPanel";
import { GraphSurfaceContainer } from "./GraphSurfaceContainer";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";
import {
  buildNumberedConceptsFromGraph,
} from "../../lib/conceptReferences";
import { userInputForBatch, userMessageForBatch } from "../../lib/batchUserInput";
import {
  closeHistoryPanel,
  setChatLoading,
  setDraftInput,
  setNotesListDrill,
  setSelectedBatchIndex,
} from "@/lib/appUiCommands";
import type {
  ProjectWithSessions,
  SessionSidebarHandle,
} from "../session-sidebar/SessionSidebar";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

function requestFocusComposer() {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
  });
}

type WorkspaceMainColumnProps = {
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: RefObject<HTMLDivElement | null>;
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  layout: AppLayoutSelectors;
  onSelectSessionFromNotesList: (session: Doc<"sessions">) => void;
  onGoToSessionGraphFromNotesList: (session: Doc<"sessions">) => void;
};

/**
 * Main column: one chat-dock machine subscription for chrome + composer + history.
 * Graph surface uses its own isolated selector hook.
 */
export function WorkspaceMainColumn({
  workspace,
  mainContentRef,
  sessionSidebarRef,
  onCreateSessionForFirstMessage,
  layout,
  onSelectSessionFromNotesList,
  onGoToSessionGraphFromNotesList,
}: WorkspaceMainColumnProps) {
  const actor = useAppUiActor();
  const dock = useChatDockMachineSelectors();
  const {
    conceptGraph,
    messages,
    batches,
    loadOlderMessages,
    canLoadOlderMessages,
  } = useSessionData();

  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(
        conceptGraph,
        batches,
        dock.selectedBatchIndex,
      ),
    [conceptGraph, batches, dock.selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || dock.selectedBatchIndex === batches.length - 1;
  const isPastBatchSelected =
    dock.viewMode === "graph" && batches.length > 0 && !isLatestBatch;

  const batchUserPrompt = useMemo(
    () => userInputForBatch(batches, messages, dock.selectedBatchIndex),
    [batches, messages, dock.selectedBatchIndex],
  );

  const lockedHistorical = useMemo((): Pick<
    SessionMessage,
    "content" | "mentions"
  > | null => {
    if (isLatestBatch || batches.length === 0) return null;
    const msg = userMessageForBatch(batches, messages, dock.selectedBatchIndex);
    if (msg) {
      return { content: msg.content, mentions: msg.mentions };
    }
    return { content: batchUserPrompt, mentions: undefined };
  }, [
    isLatestBatch,
    batches,
    messages,
    dock.selectedBatchIndex,
    batchUserPrompt,
  ]);

  const chatComposerVisible = dock.viewMode === "graph";

  return (
    <main
      className={clsx(
        "relative flex flex-1 flex-col min-w-0",
        (dock.chatLoadingOnGraphFrame || dock.chatLoadingOnNotesList) &&
          "rounded-md session-loading-inset-ring-pulse",
        !dock.chatLoadingOnGraphFrame &&
          !dock.chatLoadingOnNotesList &&
          isPastBatchSelected &&
          "rounded-md",
      )}
      data-tour="main-content"
      aria-busy={
        dock.chatLoadingOnGraphFrame || dock.chatLoadingOnNotesList
          ? true
          : undefined
      }
    >
      {!dock.chatLoadingOnGraphFrame &&
      !dock.chatLoadingOnNotesList &&
      isPastBatchSelected ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-md session-past-frame-overlay"
          aria-hidden
        />
      ) : null}
      {!dock.chatLoadingOnGraphFrame &&
      !dock.chatLoadingOnNotesList &&
      isPastBatchSelected ? (
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-[2px] w-[min(calc(100%-2rem),720px)] -translate-x-1/2 bg-background"
          aria-hidden
        />
      ) : null}
      <div
        ref={mainContentRef}
        className="relative flex flex-1 min-h-0 flex-col"
      >
        {layout.viewMode === "notesList" ? (
          <NotesListPanel
            workspace={workspace}
            activeSessionId={layout.activeSessionId}
            drill={layout.notesListDrill}
            onDrillChange={(drill) => setNotesListDrill(actor, drill)}
            onOpenNotesEditor={onSelectSessionFromNotesList}
            onOpenSessionGraph={onGoToSessionGraphFromNotesList}
          />
        ) : (
          <GraphSurfaceContainer
            workspace={workspace}
            sessionSidebarRef={sessionSidebarRef}
            activeSessionId={layout.activeSessionId}
          />
        )}
      </div>
      {chatComposerVisible && (
        <Chat
          sessionId={layout.activeSessionId}
          sessionLoadingFrame={dock.chatLoadingOnGraphFrame}
          sessionPastFrame={isPastBatchSelected}
          autoCollapseSignal={dock.uiCollapseSignal}
          isLoading={dock.chatLoading}
          setIsLoading={(loading) => setChatLoading(actor, loading)}
          numberedConcepts={numberedConcepts}
          draftInput={dock.draftInput}
          setDraftInput={(v) => setDraftInput(actor, v)}
          onCreateSession={onCreateSessionForFirstMessage}
          lockedHistorical={lockedHistorical}
          selectedBatchIndex={dock.selectedBatchIndex}
        />
      )}
      {dock.viewMode === "graph" && (
        <ChatHistoryPanel
          isOpen={dock.historyPanelOpen}
          onClose={() => {
            closeHistoryPanel(actor);
            requestFocusComposer();
          }}
          messages={messages ?? []}
          onLoadOlderMessages={
            canLoadOlderMessages
              ? () => loadOlderMessages(CHAT_MESSAGES_PAGE_SIZE)
              : undefined
          }
          canLoadOlderMessages={canLoadOlderMessages}
          batches={batches}
          selectedBatchIndex={dock.selectedBatchIndex}
          onNavigateToStep={(batchIndex: number) => {
            setSelectedBatchIndex(actor, batchIndex);
            closeHistoryPanel(actor);
            requestFocusComposer();
          }}
        />
      )}
    </main>
  );
}
