import { useMemo, type RefObject } from "react";
import { clsx } from "clsx";
import type { Id } from "../../../convex/_generated/dataModel";
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
  setChatThreadLoading,
  setChatDraftInput,
  setDraftInput,
  setNotesListDrill,
  setSelectedBatchIndex,
} from "@/lib/appUiCommands";
import type { ProjectWithSessions, WorkspaceFile } from "../session-sidebar/workspaceTypes";
import { useDefaultSessionSelection } from "@/hooks/useDefaultSessionSelection";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

function requestFocusComposer() {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
  });
}

type WorkspaceMainColumnProps = {
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: RefObject<HTMLDivElement | null>;
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  layout: AppLayoutSelectors;
  onSelectSessionFromNotesList: (file: WorkspaceFile) => void;
  onRunTutorial?: () => void;
};

/**
 * Main column: one chat-dock machine subscription for chrome + composer + history.
 * Graph surface uses its own isolated selector hook.
 */
export function WorkspaceMainColumn({
  workspace,
  mainContentRef,
  onCreateSessionForFirstMessage,
  layout,
  onSelectSessionFromNotesList,
  onRunTutorial,
}: WorkspaceMainColumnProps) {
  const actor = useAppUiActor();
  const { handleCreateChatSession } = useDefaultSessionSelection();
  const dock = useChatDockMachineSelectors();
  const {
    conceptGraph,
    messages,
    batches,
    loadOlderMessages,
    canLoadOlderMessages,
  } = useSessionData();

  const chatOpen = dock.sessionView === "chat";
  const latestBatchIndex = Math.max(0, batches.length - 1);
  const activeFileId = layout.activeFileId;

  const graphNumberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(
        conceptGraph,
        batches,
        dock.selectedBatchIndex,
      ),
    [conceptGraph, batches, dock.selectedBatchIndex],
  );
  const chatNumberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(conceptGraph, batches, latestBatchIndex),
    [conceptGraph, batches, latestBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || dock.selectedBatchIndex === batches.length - 1;
  const isPastBatchSelected =
    dock.viewMode === "graph" &&
    batches.length > 0 &&
    !isLatestBatch;

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
          !chatOpen &&
          "rounded-md",
      )}
      data-tour="main-content"
      aria-busy={
        dock.chatLoadingOnGraphFrame || dock.chatLoadingOnNotesList
          ? true
          : undefined
      }
    >
      <div
        ref={mainContentRef}
        className="relative flex flex-1 min-h-0 flex-col"
      >
        {/* Keep explorer mounted on graph so UserCard (and list state) do not remount — same as file overlay. */}
        <div
          className={clsx(
            layout.viewMode === "notesList"
              ? "flex min-h-0 flex-1 flex-col"
              : "hidden",
          )}
          inert={layout.viewMode !== "notesList" ? true : undefined}
        >
          <NotesListPanel
            workspace={workspace}
            activeFileId={layout.activeFileId}
            activeProjectId={layout.activeProjectId}
            drill={layout.notesListDrill}
            onDrillChange={(drill) => setNotesListDrill(actor, drill)}
            onOpenNotesEditor={onSelectSessionFromNotesList}
            onRunTutorial={onRunTutorial}
          />
        </div>
        {layout.viewMode === "graph" ? (
          <GraphSurfaceContainer
            workspace={workspace}
            activeFileId={layout.activeFileId}
            activeSessionId={layout.activeSessionId}
            activeChatSessionId={layout.activeChatSessionId}
            sessionPastFrame={
              !dock.chatLoadingOnGraphFrame &&
              !dock.chatLoadingOnNotesList &&
              isPastBatchSelected
            }
            graphComposer={
              chatComposerVisible ? (
                <Chat
                  sessionId={layout.activeSessionId}
                  sessionLoadingFrame={dock.chatLoadingOnGraphFrame}
                  sessionPastFrame={isPastBatchSelected}
                  autoCollapseSignal={dock.uiCollapseSignal}
                  isLoading={dock.chatLoading}
                  setIsLoading={(loading) => setChatLoading(actor, loading)}
                  numberedConcepts={graphNumberedConcepts}
                  draftInput={dock.draftInput}
                  setDraftInput={(v) => setDraftInput(actor, v)}
                  onCreateSession={onCreateSessionForFirstMessage}
                  lockedHistorical={lockedHistorical}
                  selectedBatchIndex={dock.selectedBatchIndex}
                  sendLane="graph"
                  autoFocus={!chatOpen}
                />
              ) : null
            }
            chatComposer={
              <Chat
                sessionId={layout.activeSessionId}
                chatSessionId={layout.activeChatSessionId}
                sessionLoadingFrame={dock.chatThreadLoading}
                autoCollapseSignal={dock.uiCollapseSignal}
                isLoading={dock.chatThreadLoading}
                setIsLoading={(loading) =>
                  setChatThreadLoading(actor, loading)
                }
                numberedConcepts={chatNumberedConcepts}
                draftInput={dock.chatDraftInput}
                setDraftInput={(v) => setChatDraftInput(actor, v)}
                onCreateChatSession={
                  activeFileId
                    ? () => handleCreateChatSession(activeFileId)
                    : undefined
                }
                selectedBatchIndex={dock.selectedBatchIndex}
                sendLane="chat"
                autoFocus={chatOpen}
                listenForFocusEvent={chatOpen}
              />
            }
          />
        ) : null}
      </div>
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
