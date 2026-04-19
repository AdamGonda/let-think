import type { RefObject } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { GraphViewHeader } from "./GraphViewHeader";
import { ConceptGraphOverlay } from "./ConceptGraphOverlay";
import type { ConceptGraphData } from "@/contexts/SessionDataContext";
import type { SessionSidebarHandle } from "./session-sidebar/workspaceTypes";

type AppContentGraphSurfaceProps = {
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
  activeSessionId: Id<"sessions"> | null;
  activeSessionTitle: string | undefined;
  batchesLength: number;
  selectedBatchIndex: number;
  hasChatHistory: boolean;
  chatLoading: boolean;
  conceptGraph: ConceptGraphData | null | undefined;
  chatVisible: boolean;
  referencedConceptIds: Set<string>;
  onSelectBatch: (index: number) => void;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
  onCardReferenceClick?: (conceptNumber: number) => void;
  onConceptCopy?: (concept: { name: string; description?: string }) => void;
};

/**
 * Graph mode header + concept area (layout only).
 */
export function AppContentGraphSurface({
  sessionSidebarRef,
  activeSessionId,
  activeSessionTitle,
  batchesLength,
  selectedBatchIndex,
  hasChatHistory,
  chatLoading,
  conceptGraph,
  chatVisible,
  referencedConceptIds,
  onSelectBatch,
  onHistoryOpen,
  onEditorOpen,
  onCardReferenceClick,
  onConceptCopy,
}: AppContentGraphSurfaceProps) {
  return (
    <>
      {activeSessionId && (
        <GraphViewHeader
          sessionTitle={activeSessionTitle}
          batchCount={batchesLength}
          selectedBatchIndex={selectedBatchIndex}
          onSelectBatch={onSelectBatch}
          hasChatHistory={hasChatHistory}
          onHistoryOpen={onHistoryOpen}
          onEditorOpen={onEditorOpen}
          onSessionTitleClick={() => sessionSidebarRef.current?.expand()}
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
          onSelectedBatchIndexChange={onSelectBatch}
          referencedConceptIds={referencedConceptIds}
          onCardReferenceClick={chatVisible ? onCardReferenceClick : undefined}
          onConceptCopy={chatVisible ? onConceptCopy : undefined}
        />
      </div>
    </>
  );
}
