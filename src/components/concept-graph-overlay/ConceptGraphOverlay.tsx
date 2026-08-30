import { useCallback, useEffect, useRef, useState } from "react";
import { timings } from "@/config";
import { ConceptGraphBatchGrid } from "./ConceptGraphBatchGrid";
import { ConceptGraphEmptyState } from "./ConceptGraphEmptyState";
import {
  type ConceptGraphData,
  type GraphNode,
  useConceptGraphOverlayModel,
} from "./useConceptGraphOverlayModel";

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
  isLoading?: boolean;
  showLoadingCards?: boolean;
  interactionBlocked?: boolean;
  loadingStartBatchLength?: number;
  /** Controlled batch index – when provided, navigation is controlled from parent */
  selectedBatchIndex?: number;
  onSelectedBatchIndexChange?: (index: number) => void;
  /** Concept IDs referenced in chat (via @1, @2) – highlighted with glow */
  referencedConceptIds?: Set<string>;
  /** When set, clicking a concept card appends `@n` to the chat draft (e.g. parent manages input). */
  onCardReferenceClick?: (conceptNumber: number) => void;
  /**
   * Copy a single concept to the system clipboard (same structured text as notes insert used).
   * Only wired on the latest batch when the parent enables it.
   */
  onConceptCopy?: (concept: {
    name: string;
    description?: string;
  }) => void | Promise<void>;
}

export function ConceptGraphOverlay({
  graph,
  className,
  isLoading = false,
  showLoadingCards = false,
  interactionBlocked = false,
  loadingStartBatchLength = 0,
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  referencedConceptIds,
  onCardReferenceClick,
  onConceptCopy,
}: ConceptGraphOverlayProps) {
  const LOADING_CARD_SLOTS = 6;
  const isInteractionBlocked = interactionBlocked;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const {
    currentBatchNodes,
    loadingBatchNodes,
    isEmpty,
    isLatestBatch,
    skeletonSlotIndices,
    swipeDirection,
    showSwipeAnimation,
    handleBatchAnimationEnd,
  } = useConceptGraphOverlayModel({
    graph,
    isLoading,
    showLoadingCards,
    loadingStartBatchLength,
    controlledBatchIndex,
    onSelectedBatchIndexChange,
    loadingCardSlots: LOADING_CARD_SLOTS,
  });

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleConceptCopyClick = useCallback(
    async (node: GraphNode) => {
      if (!onConceptCopy) return;
      try {
        await Promise.resolve(
          onConceptCopy({
            name: node.name,
            description: node.description,
          }),
        );
        if (copyFeedbackTimeoutRef.current != null) {
          clearTimeout(copyFeedbackTimeoutRef.current);
        }
        setCopiedNodeId(node.id);
        copyFeedbackTimeoutRef.current = setTimeout(() => {
          setCopiedNodeId(null);
          copyFeedbackTimeoutRef.current = null;
        }, timings.copiedFeedbackMs);
      } catch {
        /* clipboard denied or copy handler failed */
      }
    },
    [onConceptCopy],
  );

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      aria-busy={isInteractionBlocked}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty && !showLoadingCards ? (
        <ConceptGraphEmptyState />
      ) : (
        <>
          <div
            ref={graphViewportRef}
            className="relative flex min-h-0 min-w-0 flex-1 items-start overflow-x-hidden overflow-y-auto p-1 pt-4 pb-4"
          >
            <ConceptGraphBatchGrid
              showSwipeAnimation={showSwipeAnimation}
              swipeDirection={swipeDirection}
              showLoadingCards={showLoadingCards}
              currentBatchNodes={currentBatchNodes}
              loadingBatchNodes={loadingBatchNodes}
              skeletonSlotIndices={skeletonSlotIndices}
              isLatestBatch={isLatestBatch}
              interactionBlocked={isInteractionBlocked}
              referencedConceptIds={referencedConceptIds}
              hoveredNodeId={hoveredNode?.id ?? null}
              copiedNodeId={copiedNodeId}
              onHoverStart={setHoveredNode}
              onHoverEnd={() => setHoveredNode(null)}
              onReferenceClick={onCardReferenceClick}
              onCopyClick={onConceptCopy ? handleConceptCopyClick : undefined}
              onAnimationEnd={handleBatchAnimationEnd}
            />
          </div>
        </>
      )}
    </div>
  );
}
