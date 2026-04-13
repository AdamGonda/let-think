import { useRef, useEffect, useLayoutEffect, useState, useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type GraphNode = {
  id: string;
  name: string;
  description?: string;
};

export type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{
    id: string;
    nodeIds: string[];
    promptSummary?: string;
    description?: string;
  }>;
};

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
  isLoading?: boolean;
  /** Controlled batch index – when provided, navigation is controlled from parent */
  selectedBatchIndex?: number;
  onSelectedBatchIndexChange?: (index: number) => void;
  /** Concept IDs referenced in chat (via @1, @2) – highlighted with glow */
  referencedConceptIds?: Set<string>;
  /** When set, clicking a concept card appends `@n` to the chat draft (e.g. parent manages input). */
  onCardReferenceClick?: (conceptNumber: number) => void;
}

export function ConceptGraphOverlay({
  graph,
  className,
  isLoading = false,
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  referencedConceptIds,
  onCardReferenceClick,
}: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [internalBatchIndex, setInternalBatchIndex] = useState<number>(0);

  const isControlled = controlledBatchIndex !== undefined && onSelectedBatchIndexChange != null;
  const selectedBatchIndex = isControlled ? controlledBatchIndex : internalBatchIndex;
  const setSelectedBatchIndex = isControlled
    ? onSelectedBatchIndexChange
    : setInternalBatchIndex;

  // Build batches: use graph.batches, or fallback to single batch with all nodes
  const batches = useMemo(() => {
    const b = graph?.batches ?? [];
    if (b.length > 0) return b;
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
    const m = new Map<string, GraphNode>();
    graph?.nodes?.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph]);

  // When a new batch arrives, jump to it to show the most up-to-date batch (uncontrolled only)
  const prevBatchesLengthRef = useRef(0);

  // Swipe on batch transition – direction matches nav (next = from right, prev = from left).
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right">("right");
  const prevBatchIndexForSwipeRef = useRef<number | undefined>(undefined);
  const isFirstSwipeLayoutRef = useRef(true);

  useLayoutEffect(() => {
    if (isFirstSwipeLayoutRef.current) {
      isFirstSwipeLayoutRef.current = false;
      prevBatchIndexForSwipeRef.current = selectedBatchIndex;
      return;
    }
    const prev = prevBatchIndexForSwipeRef.current;
    prevBatchIndexForSwipeRef.current = selectedBatchIndex;
    if (prev === undefined || selectedBatchIndex === prev) return;
    /* eslint-disable react-hooks/set-state-in-effect -- swipe UI must follow prop-driven batch index before paint */
    setSwipeDirection(selectedBatchIndex > prev ? "right" : "left");
    setIsAnimating(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedBatchIndex]);

  const handleBatchAnimationEnd = () => {
    setIsAnimating(false);
  };

  useEffect(() => {
    if (batches.length === 0 || isControlled) return;
    const prevLen = prevBatchesLengthRef.current;
    prevBatchesLengthRef.current = batches.length;
    if (batches.length > prevLen) {
      setSelectedBatchIndex(batches.length - 1);
    } else {
      setSelectedBatchIndex(Math.min(selectedBatchIndex, batches.length - 1));
    }
  }, [batches.length, isControlled, selectedBatchIndex, setSelectedBatchIndex]);

  const isEmpty = !graph?.nodes?.length;

  // Current batch nodes only – single-batch view
  const currentBatchNodes = useMemo(() => {
    const safeIndex = Math.min(
      Math.max(0, selectedBatchIndex),
      Math.max(0, batches.length - 1)
    );
    const batch = batches[safeIndex];
    if (!batch?.nodeIds?.length) return [];
    return batch.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n != null)
      .map((node, i) => ({ node, number: i + 1 }));
  }, [batches, selectedBatchIndex, nodeMap]);

  const isLatestBatch =
    batches.length > 0 && selectedBatchIndex === batches.length - 1;

  const showSwipeAnimation = isAnimating && currentBatchNodes.length > 0;

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      aria-busy={isLoading}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 px-6">
          <span className="font-brand text-2xl text-muted-foreground tracking-[0.05em]">LET THINK</span>
        </div>
      ) : (
        <>
          <div
            ref={graphViewportRef}
            className="flex flex-1 p-1 min-h-0 min-w-0 overflow-auto relative py-4 items-start"
          >
            <div
              key={selectedBatchIndex}
              className={`grid min-h-full w-full grid-cols-1 gap-6 p-4 auto-rows-[minmax(200px,calc((100%-7.5rem)/6))] sm:grid-cols-2 sm:auto-rows-[minmax(200px,calc((100%-3rem)/3))] lg:grid-cols-3 lg:auto-rows-[minmax(200px,calc((100%-1.5rem)/2))] ${
                showSwipeAnimation
                  ? swipeDirection === "right"
                    ? "animate-batch-swipe-right"
                    : "animate-batch-swipe-left"
                  : ""
              }`}
              onAnimationEnd={handleBatchAnimationEnd}
            >
              {currentBatchNodes.map(({ node, number }) => {
                const isHovered = hoveredNode?.id === node.id;
                const showDescription = isHovered && node.description;
                const isReferenced = referencedConceptIds?.has(node.id);
                const showNumberBadge = isLatestBatch;

                return (
                  <Card
                    key={node.id}
                    size="sm"
                    cornerRipple
                    role={onCardReferenceClick ? "button" : undefined}
                    tabIndex={onCardReferenceClick ? 0 : undefined}
                    onClick={
                      onCardReferenceClick
                        ? () => onCardReferenceClick(number)
                        : undefined
                    }
                    onKeyDown={
                      onCardReferenceClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onCardReferenceClick(number);
                            }
                          }
                        : undefined
                    }
                    className={`relative flex h-full min-h-[200px] flex-col transition-colors duration-200${
                      onCardReferenceClick ? " cursor-pointer" : ""
                    }`}
                    aria-label={
                      onCardReferenceClick
                        ? `Add or remove @${number} in message`
                        : undefined
                    }
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      boxShadow: isReferenced
                        ? "0 0 0 2px var(--session-accent)"
                        : undefined,
                    }}
                  >
                    {showNumberBadge && (
                      <div
                        className="absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-10"
                        style={{
                          outline: isReferenced
                            ? "2px solid var(--session-accent)"
                            : undefined,
                          outlineOffset: 2,
                        }}
                      >
                        {number}
                      </div>
                    )}
                    {/* Default: centered title only */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center px-6 py-4 transition-opacity duration-200 ${
                        showDescription ? "opacity-0 pointer-events-none" : "opacity-100"
                      }`}
                    >
                      <CardTitle className="text-xl sm:text-2xl font-semibold text-center">
                        {node.name}
                      </CardTitle>
                    </div>
                    {/* Hover overlay: title at top, description below */}
                    {node.description && (
                      <div
                        className={`absolute inset-0 flex flex-col p-6 overflow-hidden transition-all duration-200 ease-out ${
                          showDescription
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 pointer-events-none translate-y-2"
                        }`}
                      >
                        <CardTitle className="text-lg sm:text-xl font-semibold shrink-0 text-left pr-10">
                          {node.name}
                        </CardTitle>
                        <CardContent
                          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-muted-foreground text-sm leading-relaxed pt-4 text-left px-0"
                          style={{
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {node.description}
                        </CardContent>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
