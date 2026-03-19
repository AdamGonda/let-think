import { useRef, useEffect, useState, useMemo } from "react";
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
}

export function ConceptGraphOverlay({
  graph,
  className,
  isLoading: _isLoading = false,
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  referencedConceptIds,
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
  }, [graph?.batches, graph?.nodes]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    graph?.nodes?.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph?.nodes]);

  // When a new batch arrives, jump to it to show the most up-to-date batch (uncontrolled only)
  const prevBatchesLengthRef = useRef(0);
  const prevBatchIndexRef = useRef(selectedBatchIndex);

  // Swipe on batch transition – direction matches nav (next = from right, prev = from left)
  const [isAnimating, setIsAnimating] = useState(false);
  const swipeDirectionRef = useRef<"left" | "right">("right");
  useEffect(() => {
    const prev = prevBatchIndexRef.current;
    if (selectedBatchIndex !== prev) {
      swipeDirectionRef.current =
        selectedBatchIndex > prev ? "right" : "left";
      prevBatchIndexRef.current = selectedBatchIndex;
      setIsAnimating(true);
    }
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
  }, [batches.length, isControlled, selectedBatchIndex]);

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

  // Clear animation state when batch has no nodes (nothing to animate)
  useEffect(() => {
    if (isAnimating && currentBatchNodes.length === 0) {
      setIsAnimating(false);
    }
  }, [isAnimating, currentBatchNodes.length]);

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
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
            className="flex flex-1 min-h-0 min-w-0 overflow-auto relative py-4"
          >
            <div
              key={selectedBatchIndex}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 w-full h-full ${
                isAnimating
                  ? swipeDirectionRef.current === "right"
                    ? "animate-batch-swipe-right"
                    : "animate-batch-swipe-left"
                  : ""
              }`}
              style={{ gridAutoRows: "minmax(200px, 1fr)" }}
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
                    className="relative flex min-h-[200px] flex-col h-full transition-colors duration-200"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      boxShadow: isReferenced ? "0 0 0 2px #1447E6" : undefined,
                    }}
                  >
                    {showNumberBadge && (
                      <div
                        className="absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-10"
                        style={{
                          outline: isReferenced ? "2px solid #1447E6" : undefined,
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
