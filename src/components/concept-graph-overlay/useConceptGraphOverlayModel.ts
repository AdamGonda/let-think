import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GraphNode = {
  id: string;
  name: string;
  description?: string;
};

type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{
    id: string;
    nodeIds: string[];
    promptSummary?: string;
    description?: string;
  }>;
};

export type ConceptGraphNodeItem = { node: GraphNode; number: number };

type UseConceptGraphOverlayModelArgs = {
  graph: ConceptGraphData | null;
  isLoading: boolean;
  showLoadingCards: boolean;
  loadingStartBatchLength: number;
  controlledBatchIndex?: number;
  onSelectedBatchIndexChange?: (index: number) => void;
  loadingCardSlots: number;
};

export function useConceptGraphOverlayModel({
  graph,
  isLoading,
  showLoadingCards,
  loadingStartBatchLength,
  controlledBatchIndex,
  onSelectedBatchIndexChange,
  loadingCardSlots,
}: UseConceptGraphOverlayModelArgs) {
  const [internalBatchIndex, setInternalBatchIndex] = useState<number>(0);
  const isControlled =
    controlledBatchIndex !== undefined && onSelectedBatchIndexChange != null;
  const selectedBatchIndex = isControlled
    ? controlledBatchIndex
    : internalBatchIndex;
  const setSelectedBatchIndex = isControlled
    ? onSelectedBatchIndexChange
    : setInternalBatchIndex;

  const batches = useMemo(() => {
    const resolvedBatches = graph?.batches ?? [];
    if (resolvedBatches.length > 0) return resolvedBatches;
    if (graph?.nodes?.length) {
      return [
        {
          id: "batch-0",
          nodeIds: graph.nodes.map((n) => n.id),
        },
      ];
    }
    return [];
  }, [graph]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graph?.nodes?.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph]);

  const prevBatchesLengthRef = useRef(0);
  useEffect(() => {
    if (batches.length === 0 || isControlled) return;
    const prevLength = prevBatchesLengthRef.current;
    prevBatchesLengthRef.current = batches.length;
    if (batches.length > prevLength) {
      setSelectedBatchIndex(batches.length - 1);
    } else {
      setSelectedBatchIndex(Math.min(selectedBatchIndex, batches.length - 1));
    }
  }, [batches.length, isControlled, selectedBatchIndex, setSelectedBatchIndex]);

  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right">("right");
  const prevBatchIndexForSwipeRef = useRef<number | undefined>(undefined);
  const isFirstSwipeLayoutRef = useRef(true);

  useLayoutEffect(() => {
    if (showLoadingCards) {
      prevBatchIndexForSwipeRef.current = selectedBatchIndex;
      setIsAnimating(false);
      return;
    }
    if (isFirstSwipeLayoutRef.current) {
      isFirstSwipeLayoutRef.current = false;
      prevBatchIndexForSwipeRef.current = selectedBatchIndex;
      return;
    }
    const prev = prevBatchIndexForSwipeRef.current;
    prevBatchIndexForSwipeRef.current = selectedBatchIndex;
    if (prev === undefined || selectedBatchIndex === prev) return;
    setSwipeDirection(selectedBatchIndex > prev ? "right" : "left");
    setIsAnimating(true);
  }, [selectedBatchIndex, showLoadingCards]);

  const handleBatchAnimationEnd = () => {
    setIsAnimating(false);
  };

  const currentBatchNodes = useMemo(() => {
    const safeIndex = Math.min(
      Math.max(0, selectedBatchIndex),
      Math.max(0, batches.length - 1),
    );
    const batch = batches[safeIndex];
    if (!batch?.nodeIds?.length) return [];
    return batch.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n != null)
      .map((node, i) => ({ node, number: i + 1 }));
  }, [batches, selectedBatchIndex, nodeMap]);

  const loadingBatchNodes = useMemo(() => {
    if (!isLoading) return [];
    if (batches.length <= loadingStartBatchLength) return [];
    const latestBatch = batches[batches.length - 1];
    if (!latestBatch?.nodeIds?.length) return [];
    return latestBatch.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n != null)
      .map((node, i) => ({ node, number: i + 1 }));
  }, [isLoading, batches, nodeMap, loadingStartBatchLength]);

  const loadingSlots = useMemo(
    () =>
      Array.from(
        { length: Math.max(loadingCardSlots, loadingBatchNodes.length) },
        (_, i) => i,
      ),
    [loadingCardSlots, loadingBatchNodes.length],
  );

  const skeletonSlotIndices = useMemo(
    () =>
      showLoadingCards
        ? loadingSlots.filter((slotIndex) => loadingBatchNodes[slotIndex] == null)
        : [],
    [showLoadingCards, loadingSlots, loadingBatchNodes],
  );

  const isEmpty = !graph?.nodes?.length;
  const isLatestBatch =
    batches.length > 0 && selectedBatchIndex === batches.length - 1;
  const showSwipeAnimation = isAnimating && currentBatchNodes.length > 0;
  const useLatestBatchViewportPadding = isLatestBatch || showLoadingCards;

  return {
    selectedBatchIndex,
    currentBatchNodes,
    loadingBatchNodes,
    isEmpty,
    isLatestBatch,
    skeletonSlotIndices,
    swipeDirection,
    showSwipeAnimation,
    useLatestBatchViewportPadding,
    handleBatchAnimationEnd,
  };
}

export type { GraphNode, ConceptGraphData };
