import type { ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { GraphViewHeader } from "../concept-graph-overlay/GraphViewHeader";
import { ConceptGraphOverlay } from "../concept-graph-overlay/ConceptGraphOverlay";
import { SessionChatThread } from "../chat/SessionChatThread";
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
  sessionPastFrame: boolean;
  referencedConceptIds: Set<string>;
  graphComposer: ReactNode;
  chatComposer: ReactNode;
  onSelectBatch: (index: number) => void;
  onSessionViewChange: (view: SessionView) => void;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
  onProjectsRootClick: () => void;
  onProjectNameClick: () => void;
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
  sessionPastFrame,
  referencedConceptIds,
  graphComposer,
  chatComposer,
  onSelectBatch,
  onSessionViewChange,
  onHistoryOpen,
  onEditorOpen,
  onProjectsRootClick,
  onProjectNameClick,
  onCardReferenceClick,
  onConceptCopy,
}: AppContentGraphSurfaceProps) {
  const chatOpen = sessionView === "chat";

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
          onSessionViewChange={onSessionViewChange}
          onHistoryOpen={onHistoryOpen}
          onEditorOpen={onEditorOpen}
          onProjectsRootClick={onProjectsRootClick}
          onProjectNameClick={onProjectNameClick}
        />
      )}
      {chatOpen ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <SessionChatThread isLoading={chatThreadLoading} />
          {chatComposer}
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
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
      )}
    </div>
  );
}
