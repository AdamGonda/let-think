import { clsx } from "clsx";
import type { ConceptGraphNodeItem } from "./useConceptGraphOverlayModel";
import { ConceptGraphNodeCard } from "./ConceptGraphNodeCard";
import { ConceptGraphSkeletonCard } from "./ConceptGraphSkeletonCard";
import type { GraphNode } from "./useConceptGraphOverlayModel";

type ConceptGraphBatchGridProps = {
  showSwipeAnimation: boolean;
  swipeDirection: "left" | "right";
  showLoadingCards: boolean;
  currentBatchNodes: ConceptGraphNodeItem[];
  loadingBatchNodes: ConceptGraphNodeItem[];
  skeletonSlotIndices: number[];
  isLatestBatch: boolean;
  interactionBlocked: boolean;
  referencedConceptIds?: Set<string>;
  hoveredNodeId: string | null;
  copiedNodeId: string | null;
  onHoverStart: (node: GraphNode) => void;
  onHoverEnd: () => void;
  onReferenceClick?: (conceptNumber: number) => void;
  onCopyClick?: (node: GraphNode) => void;
  onAnimationEnd: () => void;
};

export function ConceptGraphBatchGrid({
  showSwipeAnimation,
  swipeDirection,
  showLoadingCards,
  currentBatchNodes,
  loadingBatchNodes,
  skeletonSlotIndices,
  isLatestBatch,
  interactionBlocked,
  referencedConceptIds,
  hoveredNodeId,
  copiedNodeId,
  onHoverStart,
  onHoverEnd,
  onReferenceClick,
  onCopyClick,
  onAnimationEnd,
}: ConceptGraphBatchGridProps) {
  const renderNodeCard = (
    item: ConceptGraphNodeItem,
    options: { animateIn?: boolean; cornerRipple?: boolean } = {},
  ) => {
    const { animateIn = false, cornerRipple = true } = options;
    const { node, number } = item;
    const isReferenced = referencedConceptIds?.has(node.id) ?? false;
    const isHovered = hoveredNodeId === node.id;
    const isCopyJustDone = copiedNodeId === node.id;
    const copyFeedbackVisible = isHovered || isCopyJustDone;
    return (
      <ConceptGraphNodeCard
        key={node.id}
        node={node}
        number={number}
        isLatestBatch={isLatestBatch}
        isReferenced={isReferenced}
        interactionBlocked={interactionBlocked}
        isHovered={isHovered}
        copyFeedbackVisible={copyFeedbackVisible}
        isCopyJustDone={isCopyJustDone}
        animateIn={animateIn}
        cornerRipple={cornerRipple}
        onHoverStart={() => onHoverStart(node)}
        onHoverEnd={onHoverEnd}
        onReferenceClick={onReferenceClick}
        onCopyClick={onCopyClick}
      />
    );
  };

  return (
    <div
      className={clsx(
        "grid h-full min-h-full w-full grid-cols-1 grid-rows-6 gap-6 p-4 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2",
        showSwipeAnimation &&
          (swipeDirection === "right"
            ? "animate-batch-swipe-right"
            : "animate-batch-swipe-left"),
      )}
      onAnimationEnd={onAnimationEnd}
    >
      {showLoadingCards ? (
        <>
          {loadingBatchNodes.map((item) =>
            renderNodeCard(item, { animateIn: true, cornerRipple: false }),
          )}
          {skeletonSlotIndices.map((slotIndex) => (
            <ConceptGraphSkeletonCard key={`loading-skeleton-${slotIndex}`} slotIndex={slotIndex} />
          ))}
        </>
      ) : (
        currentBatchNodes.map((item) => renderNodeCard(item))
      )}
    </div>
  );
}
