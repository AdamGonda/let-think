import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { RefObject, MutableRefObject } from "react";
import { Check, Clipboard } from "lucide-react";
import { toast } from "sonner";

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
  modalContainerRef?: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  isDark?: boolean;
  /** Controlled batch index – when provided, navigation is controlled from parent */
  selectedBatchIndex?: number;
  onSelectedBatchIndexChange?: (index: number) => void;
  /** Ref to assign a function that opens the batch modal for a given index (for external trigger, e.g. top bar seed button) */
  openBatchModalRef?: MutableRefObject<((batchIndex: number) => void) | null>;
  /** Concept IDs referenced in chat (via @1, @2) – highlighted with glow */
  referencedConceptIds?: Set<string>;
}

export function ConceptGraphOverlay({
  graph,
  className,
  modalContainerRef,
  isLoading: _isLoading = false,
  isDark = false,
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  openBatchModalRef,
  referencedConceptIds,
}: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [batchModalIndex, setBatchModalIndex] = useState<number | null>(null);
  const [internalBatchIndex, setInternalBatchIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  const isControlled = controlledBatchIndex !== undefined && onSelectedBatchIndexChange != null;
  const selectedBatchIndex = isControlled ? controlledBatchIndex : internalBatchIndex;
  const setSelectedBatchIndex = isControlled
    ? onSelectedBatchIndexChange
    : setInternalBatchIndex;

  // Align modal x with graph viewport center (fixes offset when portaled to main content)
  const [modalLeft, setModalLeft] = useState<number | null>(null);
  // Portal target must not be read from ref during render – store in state, sync in effect
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (batchModalIndex == null) {
      setPortalTarget(null);
      return;
    }
    setPortalTarget(modalContainerRef?.current ?? document.body);
  }, [batchModalIndex, modalContainerRef]);

  useEffect(() => {
    if (batchModalIndex == null || !graphViewportRef.current) {
      setModalLeft(null);
      return;
    }
    const updatePosition = () => {
      const viewport = graphViewportRef.current;
      const container = modalContainerRef?.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const left =
        container && document.body.contains(container)
          ? centerX - container.getBoundingClientRect().left
          : centerX;
      setModalLeft(left);
    };
    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    ro.observe(graphViewportRef.current);
    if (modalContainerRef?.current) ro.observe(modalContainerRef.current);
    return () => ro.disconnect();
  }, [batchModalIndex, modalContainerRef]);

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

  useEffect(() => {
    if (!openBatchModalRef) return;
    openBatchModalRef.current = (batchIndex: number) => {
      if (batches[batchIndex]?.description) {
        setBatchModalIndex(batchIndex);
      }
    };
    return () => {
      openBatchModalRef.current = null;
    };
  }, [openBatchModalRef, batches]);

  // When a new batch arrives, jump to it to show the most up-to-date batch (uncontrolled only)
  const prevBatchesLengthRef = useRef(0);
  const prevBatchIndexRef = useRef(selectedBatchIndex);

  // Determine slide direction when batch changes (for animation)
  const slideDirection =
    selectedBatchIndex > prevBatchIndexRef.current ? "right" : "left";
  useEffect(() => {
    prevBatchIndexRef.current = selectedBatchIndex;
  }, [selectedBatchIndex]);

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

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400 text-2xl py-6 px-6">
          LET THINK
        </div>
      ) : (
        <>
          {batchModalIndex != null &&
            batches[batchModalIndex]?.description &&
            typeof document !== "undefined" &&
            portalTarget &&
            (() => {
              const target = portalTarget;
              const isInMain = target !== document.body;
              return createPortal(
                <>
                  <div
                    className={`${isInMain ? "absolute" : "fixed"} inset-0 z-[9998] bg-black/40`}
                    onClick={() => setBatchModalIndex(null)}
                    aria-hidden
                  />
                  <div
                    className={`${isInMain ? "absolute" : "fixed"} top-1/2 z-[9999] w-[960px] max-w-[95vw] max-h-[80vh] -translate-x-1/2 -translate-y-1/2`}
                    style={{ left: modalLeft != null ? `${modalLeft}px` : "50%" }}
                    role="dialog"
                    aria-modal
                    aria-labelledby="batch-modal-title"
                  >
                    <div
                      className="flex flex-col max-h-[80vh] rounded bg-white dark:bg-zinc-800 shadow-2xl border-2 border-zinc-300 dark:border-zinc-600 animate-modal-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-zinc-300 dark:border-zinc-600">
                        <h2
                          id="batch-modal-title"
                          className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                        >
                          User Input
                        </h2>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const text = batches[batchModalIndex]?.description ?? "";
                              await navigator.clipboard.writeText(text);
                              toast.success("Copied to clipboard");
                              if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
                              setCopied(true);
                              copiedTimeoutRef.current = setTimeout(() => {
                                setCopied(false);
                                copiedTimeoutRef.current = null;
                              }, 2000);
                            }}
                            className="p-1.5 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            aria-label={copied ? "Copied" : "Copy to clipboard"}
                          >
                            {copied ? (
                              <Check
                                size={20}
                                strokeWidth={2.5}
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                            ) : (
                              <Clipboard size={20} strokeWidth={2} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBatchModalIndex(null)}
                            className="p-1.5 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            aria-label="Close"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div
                        className="overflow-y-auto overscroll-contain p-6 min-h-0"
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        <pre className="text-left text-zinc-800 dark:text-white/95 whitespace-pre-wrap leading-relaxed text-sm font-mono">
                          {batches[batchModalIndex]!.description}
                        </pre>
                      </div>
                    </div>
                  </div>
                </>,
                target
              );
            })()}
          <div
            ref={graphViewportRef}
            className="flex flex-1 min-h-0 min-w-0 overflow-auto relative py-4"
          >
            <div
              key={selectedBatchIndex}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 w-full h-full ${
                slideDirection === "right" ? "animate-batch-from-right" : "animate-batch-from-left"
              }`}
              style={{ gridAutoRows: "minmax(200px, 1fr)" }}
            >
              {currentBatchNodes.map(({ node, number }) => {
                const isHovered = hoveredNode?.id === node.id;
                const showDescription = isHovered && node.description;
                const isReferenced = referencedConceptIds?.has(node.id);
                const showNumberBadge = isLatestBatch;

                return (
                  <div
                    key={node.id}
                    className="relative flex min-h-[200px] flex-col rounded-lg bg-white dark:bg-zinc-800 p-4 shadow-sm border border-zinc-200 dark:border-zinc-700 transition-colors duration-200 h-full"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      boxShadow: isReferenced
                        ? isDark
                          ? "0 0 0 2px rgb(52, 211, 153)"
                          : "0 0 0 2px rgb(16, 185, 129)"
                        : undefined,
                    }}
                  >
                    {/* Number badge - only on latest batch (reference with @1, @2) */}
                    {showNumberBadge && (
                      <div
                        className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white dark:text-zinc-100 text-sm font-semibold"
                        style={{
                          outline: isReferenced
                            ? isDark
                              ? "2px solid rgb(52, 211, 153)"
                              : "2px solid rgb(16, 185, 129)"
                            : undefined,
                          outlineOffset: 2,
                        }}
                      >
                        {number}
                      </div>
                    )}
                    <div className="shrink-0 font-semibold text-zinc-800 dark:text-zinc-200 text-xl pr-10">
                      {node.name}
                    </div>
                    {node.description ? (
                      <div
                        className={`flex-1 min-h-0 mt-2 overflow-y-auto text-zinc-600 dark:text-zinc-400 text-base leading-relaxed transition-opacity duration-200 ${
                          showDescription ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {node.description}
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
