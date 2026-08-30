import type { Id } from "../../../convex/_generated/dataModel";
import { GraphViewHeader } from "../concept-graph-overlay/GraphViewHeader";
import { ConceptGraphOverlay } from "../concept-graph-overlay/ConceptGraphOverlay";
import type { ConceptGraphData } from "@/contexts/SessionDataContext";

type AppContentGraphSurfaceProps = {
  activeSessionId: Id<"sessions"> | null;
  activeSessionTitle: string | undefined;
  activeProjectName: string | undefined;
  batchesLength: number;
  selectedBatchIndex: number;
  hasChatHistory: boolean;
  chatLoading: boolean;
  graphShowLoadingCards: boolean;
  graphInteractionBlocked: boolean;
  graphLoadingStartBatchLength: number;
  conceptGraph: ConceptGraphData | null | undefined;
  chatVisible: boolean;
  referencedConceptIds: Set<string>;
  onSelectBatch: (index: number) => void;
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
  graphShowLoadingCards,
  graphInteractionBlocked,
  graphLoadingStartBatchLength,
  conceptGraph,
  chatVisible,
  referencedConceptIds,
  onSelectBatch,
  onHistoryOpen,
  onEditorOpen,
  onProjectsRootClick,
  onProjectNameClick,
  onCardReferenceClick,
  onConceptCopy,
}: AppContentGraphSurfaceProps) {
  return (
    <>
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
          onHistoryOpen={onHistoryOpen}
          onEditorOpen={onEditorOpen}
          onProjectsRootClick={onProjectsRootClick}
          onProjectNameClick={onProjectNameClick}
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
    </>
  );
}
