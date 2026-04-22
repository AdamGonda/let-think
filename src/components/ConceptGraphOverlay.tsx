import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
  type MouseEvent,
} from "react";
import { clsx } from "clsx";
import { Brain, Check, Copy } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { layout, timings } from "@/config";

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
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  referencedConceptIds,
  onCardReferenceClick,
  onConceptCopy,
}: ConceptGraphOverlayProps) {
  const LOADING_CARD_SLOTS = 6;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
    if (isLoading) {
      // During progressive loading we keep the surface stable (no batch flip animation).
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
    /* eslint-disable react-hooks/set-state-in-effect -- swipe UI must follow prop-driven batch index before paint */
    setSwipeDirection(selectedBatchIndex > prev ? "right" : "left");
    setIsAnimating(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedBatchIndex, isLoading]);

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

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleConceptCopyClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, node: GraphNode) => {
      e.stopPropagation();
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
  const loadingStartBatchesLengthRef = useRef(0);
  const previousLoadingRef = useRef(false);
  const wasLoading = previousLoadingRef.current;
  if (isLoading && !wasLoading) {
    // Capture cutoff before paint to prevent old-card flash on first loading frame.
    loadingStartBatchesLengthRef.current = batches.length;
  } else if (!isLoading && wasLoading) {
    loadingStartBatchesLengthRef.current = 0;
  }
  previousLoadingRef.current = isLoading;

  const loadingBatchNodes = useMemo(() => {
    if (!isLoading) return [];
    const startLength = loadingStartBatchesLengthRef.current;
    if (batches.length <= startLength) return [];
    const latestBatch = batches[batches.length - 1];
    if (!latestBatch?.nodeIds?.length) return [];
    return latestBatch.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n != null)
      .map((node, i) => ({ node, number: i + 1 }));
  }, [isLoading, batches, nodeMap]);

  const showLoadingCards = isLoading;
  const useLatestBatchViewportPadding = isLatestBatch || showLoadingCards;
  const loadingSlots = useMemo(
    () => Array.from({ length: Math.max(LOADING_CARD_SLOTS, loadingBatchNodes.length) }, (_, i) => i),
    [loadingBatchNodes.length]
  );

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      aria-busy={isLoading}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty && !showLoadingCards ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 px-6">
          <span className="font-brand text-2xl text-muted-foreground tracking-[0.05em]">LET THINK</span>
        </div>
      ) : (
        <>
          <div
            ref={graphViewportRef}
            className={clsx(
              "flex flex-1 p-1 min-h-0 min-w-0 overflow-auto relative items-start pt-4",
              useLatestBatchViewportPadding
                ? "pb-4"
                : layout.graphViewportBottomPadNonLatestClass,
            )}
          >
            <div
              key={selectedBatchIndex}
              className={clsx(
                "grid min-h-full w-full grid-cols-1 gap-6 p-4 auto-rows-[minmax(200px,calc((100%-7.5rem)/6))] sm:grid-cols-2 sm:auto-rows-[minmax(200px,calc((100%-3rem)/3))] lg:grid-cols-3 lg:auto-rows-[minmax(200px,calc((100%-1.5rem)/2))]",
                showSwipeAnimation &&
                  (swipeDirection === "right"
                    ? "animate-batch-swipe-right"
                    : "animate-batch-swipe-left"),
              )}
              onAnimationEnd={handleBatchAnimationEnd}
            >
              {showLoadingCards
                ? loadingSlots.map((slotIndex) => {
                    const item = loadingBatchNodes[slotIndex];
                    if (!item) {
                      return (
                        <Card
                          key={`loading-skeleton-${slotIndex}`}
                          size="sm"
                          cornerRipple
                          className="relative flex h-full min-h-[200px] flex-col"
                        >
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <Brain
                              size={18}
                              className="text-muted-foreground/70"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </div>
                        </Card>
                      );
                    }
                    const { node, number } = item;
                    const isReferenced = referencedConceptIds?.has(node.id);
                    return (
                      <Card
                        key={node.id}
                        size="sm"
                        cornerRipple
                        className={clsx(
                          "relative flex h-full min-h-[200px] flex-col transition-colors duration-200",
                          isReferenced && "session-accent-ref-glow-pulse",
                        )}
                        style={{
                          boxShadow: isReferenced
                            ? "0 0 0 2px var(--session-accent)"
                            : undefined,
                        }}
                      >
                        <div
                          className={clsx(
                            "absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 pointer-events-none",
                            isReferenced && "session-accent-ref-outline-pulse",
                          )}
                          style={{
                            outline: isReferenced
                              ? "2px solid var(--session-accent)"
                              : undefined,
                            outlineOffset: 2,
                          }}
                        >
                          {number}
                        </div>
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-6 py-4 transition-opacity duration-200 opacity-100">
                          <CardTitle className="text-xl sm:text-2xl font-semibold text-center">
                            {node.name}
                          </CardTitle>
                        </div>
                      </Card>
                    );
                  })
                : currentBatchNodes.map(({ node, number }) => {
                const isHovered = hoveredNode?.id === node.id;
                const showDescription = isHovered && node.description;
                const isReferenced = referencedConceptIds?.has(node.id);
                const showNumberBadge = isLatestBatch;
                const copyFeedbackVisible =
                  isHovered || copiedNodeId === node.id;
                const isCopyJustDone = copiedNodeId === node.id;
                return (
                  <Card
                    key={node.id}
                    size="sm"
                    cornerRipple
                    className={clsx(
                      "relative flex h-full min-h-[200px] flex-col transition-colors duration-200",
                      isReferenced && isLoading && "session-accent-ref-glow-pulse",
                    )}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      boxShadow:
                        isReferenced && !isLoading
                          ? "0 0 0 2px var(--session-accent)"
                          : undefined,
                    }}
                  >
                    {showNumberBadge && (
                      onCardReferenceClick ? (
                        <button
                          type="button"
                          className={clsx(
                            "absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 pointer-events-auto cursor-pointer transition-colors hover:bg-muted/80",
                            isReferenced &&
                              isLoading &&
                              "session-accent-ref-outline-pulse",
                          )}
                          aria-label={`Add or remove @${number} in message`}
                          onClick={() => onCardReferenceClick(number)}
                          style={{
                            outline: isReferenced
                              ? "2px solid var(--session-accent)"
                              : undefined,
                            outlineOffset: 2,
                          }}
                        >
                          {number}
                        </button>
                      ) : (
                        <div
                          className={clsx(
                            "absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 pointer-events-auto",
                            isReferenced &&
                              isLoading &&
                              "session-accent-ref-outline-pulse",
                          )}
                          style={{
                            outline: isReferenced
                              ? "2px solid var(--session-accent)"
                              : undefined,
                            outlineOffset: 2,
                          }}
                        >
                          {number}
                        </div>
                      )
                    )}
                    {/* Default: centered title only */}
                    <div
                      className={clsx(
                        "absolute inset-0 pointer-events-none flex items-center justify-center px-6 py-4 transition-opacity duration-200",
                        showDescription
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100",
                      )}
                    >
                      <CardTitle className="text-xl sm:text-2xl font-semibold text-center">
                        {node.name}
                      </CardTitle>
                    </div>
                    {/* Hover overlay: title at top, description below */}
                    {node.description && (
                      <div
                        className={clsx(
                          "absolute inset-0 pointer-events-none flex flex-col p-6 overflow-hidden transition-all duration-200 ease-out",
                          showDescription
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 pointer-events-none translate-y-2",
                        )}
                      >
                        <CardTitle className="text-lg sm:text-xl lg:text-xl xl:text-2xl font-semibold shrink-0 text-left pr-10">
                          {node.name}
                        </CardTitle>
                        <CardContent
                          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-muted-foreground text-sm sm:text-base lg:text-lg xl:text-xl sm:leading-relaxed lg:leading-normal pt-4 text-left px-0"
                          style={{
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {node.description}
                        </CardContent>
                      </div>
                    )}
                    {showNumberBadge && onConceptCopy && (
                      <button
                        type="button"
                        className={clsx(
                          "absolute bottom-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 cursor-pointer",
                          "transition-opacity duration-200 ease-out",
                          "hover:bg-muted/80 hover:text-foreground",
                          copyFeedbackVisible
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none",
                        )}
                        aria-label={
                          isCopyJustDone
                            ? `Copied ${node.name}`
                            : `Copy ${node.name} to clipboard`
                        }
                        onClick={(e) => handleConceptCopyClick(e, node)}
                      >
                        {isCopyJustDone ? (
                          <span className="animate-concept-copy-tick">
                            <Check
                              className="size-3.5 text-green-600"
                              aria-hidden="true"
                            />
                          </span>
                        ) : (
                          <Copy className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
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
