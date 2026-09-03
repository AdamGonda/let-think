import { type ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { GraphViewHeader } from "../concept-graph-overlay/GraphViewHeader";
import { ConceptGraphOverlay } from "../concept-graph-overlay/ConceptGraphOverlay";
import { SessionChatThread } from "../chat/SessionChatThread";
import { FileChatList, type FileChatListItem } from "../chat/FileChatList";
import { SessionCanvas } from "../session-canvas/SessionCanvas";
import { cn } from "@/lib/utils";
import type { ConceptGraphData } from "@/contexts/SessionDataContext";
import type { SessionView } from "@/machines/appUiTypes";

type AppContentGraphSurfaceProps = {
  activeSessionId: Id<"sessions"> | null;
  activeSessionTitle: string | undefined;
  activeProjectName: string | undefined;
  batchesLength: number;
  selectedBatchIndex: number;
  hasChatHistory: boolean;
  chatLoading: boolean;
  chatThreadLoading: boolean;
  graphShowLoadingCards: boolean;
  graphInteractionBlocked: boolean;
  graphLoadingStartBatchLength: number;
  conceptGraph: ConceptGraphData | null | undefined;
  chatVisible: boolean;
  sessionView: SessionView;
  editorOpen: boolean;
  sessionPastFrame: boolean;
  referencedConceptIds: Set<string>;
  graphComposer: ReactNode;
  chatComposer: ReactNode;
  onSelectBatch: (index: number) => void;
  onSessionViewChange: (view: SessionView) => void;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
  onProjectNameClick: () => void;
  fileChats: FileChatListItem[];
  activeChatSessionId: Id<"chatSessions"> | null;
  onSelectChatSession: (id: Id<"chatSessions">) => void;
  onNewChat: () => void;
  onCardReferenceClick?: (conceptNumber: number) => void;
  onConceptCopy?: (concept: { name: string; description?: string }) => void;
};

export function AppContentGraphSurface({
  activeSessionId,
  activeSessionTitle,
  activeProjectName,
  batchesLength,
  selectedBatchIndex,
  hasChatHistory,
  chatLoading,
  chatThreadLoading,
  graphShowLoadingCards,
  graphInteractionBlocked,
  graphLoadingStartBatchLength,
  conceptGraph,
  chatVisible,
  sessionView,
  editorOpen,
  sessionPastFrame,
  referencedConceptIds,
  graphComposer,
  chatComposer,
  onSelectBatch,
  onSessionViewChange,
  onHistoryOpen,
  onEditorOpen,
  onProjectNameClick,
  fileChats,
  activeChatSessionId,
  onSelectChatSession,
  onNewChat,
  onCardReferenceClick,
  onConceptCopy,
}: AppContentGraphSurfaceProps) {
  const chatOpen = sessionView === "chat";
  const graphOpen = sessionView === "graph";
  const canvasOpen = sessionView === "canvas";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {activeSessionId && (
        <GraphViewHeader
          projectName={activeProjectName}
          sessionTitle={activeSessionTitle}
          batchCount={batchesLength}
          selectedBatchIndex={selectedBatchIndex}
          onSelectBatch={onSelectBatch}
          isBatchNavigationDisabled={chatLoading}
          isSessionTitleDisabled={chatLoading}
          isHistoryButtonDisabled={chatLoading}
          hasChatHistory={hasChatHistory}
          sessionView={sessionView}
          editorOpen={editorOpen}
          onSessionViewChange={onSessionViewChange}
          onHistoryOpen={onHistoryOpen}
          onEditorOpen={onEditorOpen}
          onProjectNameClick={onProjectNameClick}
        />
      )}
      {chatOpen ? (
        <div className="relative flex min-h-0 flex-1  flex-col">
          <div className="pointer-events-none absolute inset-y-0 left-4 z-30 flex items-start pt-[130px]">
            <div className="pointer-events-auto">
              <FileChatList
                chats={fileChats}
                activeChatSessionId={activeChatSessionId}
                onSelect={onSelectChatSession}
                onNewChat={onNewChat}
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <SessionChatThread
              key={activeChatSessionId ?? "empty"}
              isLoading={chatThreadLoading}
            />
            {chatComposer}
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "relative min-h-0 flex-1 flex-col",
          graphOpen ? "flex" : "hidden",
        )}
        inert={!graphOpen ? true : undefined}
      >
        {sessionPastFrame ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 rounded-md session-past-frame-overlay"
            aria-hidden
          />
        ) : null}
        {sessionPastFrame ? (
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-[2px] w-[min(calc(100%-2rem),720px)] -translate-x-1/2 bg-background"
            aria-hidden
          />
        ) : null}
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
            showLoadingCards={graphShowLoadingCards}
            interactionBlocked={graphInteractionBlocked}
            loadingStartBatchLength={graphLoadingStartBatchLength}
            selectedBatchIndex={selectedBatchIndex}
            onSelectedBatchIndexChange={onSelectBatch}
            referencedConceptIds={referencedConceptIds}
            onCardReferenceClick={chatVisible ? onCardReferenceClick : undefined}
            onConceptCopy={chatVisible ? onConceptCopy : undefined}
          />
        </div>
        {graphComposer}
      </div>
      <div
        className={cn(
          "relative min-h-0 flex-1 flex-col",
          canvasOpen ? "flex" : "hidden",
        )}
        inert={!canvasOpen ? true : undefined}
      >
        <SessionCanvas
          key={activeSessionId ?? "empty"}
          sessionId={activeSessionId}
          active={canvasOpen}
        />
      </div>
    </div>
  );
}
