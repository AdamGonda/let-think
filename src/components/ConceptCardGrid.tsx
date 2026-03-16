import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

type ConceptNode = {
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

interface ConceptCardGridProps {
  graph: ConceptGraphData | null;
  className?: string;
  selectedNodeIds?: Set<string>;
  onToggleNodeSelection?: (nodeId: string) => void;
  modalContainerRef?: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
}

export function ConceptCardGrid({
  graph,
  className,
  selectedNodeIds = new Set(),
  onToggleNodeSelection,
  modalContainerRef,
  isLoading = false,
}: ConceptCardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [batchModalIndex, setBatchModalIndex] = useState<number | null>(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);

  // Align modal x with content center (fixes offset when portaled to main content)
  const [modalLeft, setModalLeft] = useState<number | null>(null);
  useEffect(() => {
    if (batchModalIndex == null || !contentRef.current) {
      setModalLeft(null);
      return;
    }
    const updatePosition = () => {
      const viewport = contentRef.current;
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
    ro.observe(contentRef.current);
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
    const m = new Map<string, ConceptNode>();
    graph?.nodes?.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph?.nodes]);

  // When a new batch arrives, jump to it to show the most up-to-date batch
  const prevBatchesLengthRef = useRef(0);
  useEffect(() => {
    if (batches.length === 0) return;
    const prevLen = prevBatchesLengthRef.current;
    prevBatchesLengthRef.current = batches.length;
    if (batches.length > prevLen) {
      setSelectedBatchIndex(batches.length - 1);
    } else {
      setSelectedBatchIndex((i) => Math.min(i, batches.length - 1));
    }
  }, [batches.length]);

  const hasBatches = batches.length > 0;
  const canGoPrev = selectedBatchIndex > 0;
  const canGoNext = selectedBatchIndex < batches.length - 1;
  const isEmpty = !graph?.nodes?.length;

  const currentBatch = hasBatches ? batches[selectedBatchIndex] : null;
  const batchNodes = currentBatch
    ? currentBatch.nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is ConceptNode => n != null)
    : [];

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
          Type a message to build your concept graph
        </div>
      ) : (
        <>
          {batchModalIndex != null &&
            batches[batchModalIndex]?.description &&
            typeof document !== "undefined" &&
            (() => {
              const portalTarget = modalContainerRef?.current ?? document.body;
              const isInMain = portalTarget !== document.body;
              return createPortal(
                <>
                  <div
                    className={`${isInMain ? "absolute" : "fixed"} inset-0 z-[9998] bg-black/40`}
                    onClick={() => setBatchModalIndex(null)}
                    aria-hidden
                  />
                  <div
                    className={`${isInMain ? "absolute" : "fixed"} top-[52%] z-[9999] w-[960px] max-w-[95vw] max-h-[80vh] -translate-x-1/2 -translate-y-1/2`}
                    style={{ left: modalLeft != null ? `${modalLeft}px` : "50%" }}
                    role="dialog"
                    aria-modal
                    aria-labelledby="batch-modal-title"
                  >
                    <div
                      className="flex flex-col max-h-[80vh] rounded bg-white dark:bg-zinc-800 shadow-2xl border-2 border-zinc-300 dark:border-zinc-600 animate-modal-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-zinc-200 dark:border-zinc-600">
                        <h2 id="batch-modal-title" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Batch details
                        </h2>
                        <button
                          type="button"
                          onClick={() => setBatchModalIndex(null)}
                          className="p-1.5 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                      <div
                        className="overflow-y-auto overscroll-contain p-6 min-h-0"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
                      >
                        <pre className="text-left text-zinc-800 dark:text-white/95 whitespace-pre-wrap leading-relaxed text-sm font-mono">
                          {batches[batchModalIndex]!.description}
                        </pre>
                      </div>
                    </div>
                  </div>
                </>,
                portalTarget
              );
            })()}
          <div
            className={`flex flex-1 min-h-0 min-w-0 relative transition-colors duration-200 ${
              isLoading
                ? "outline-2 outline-solid outline-violet-600 dark:outline-violet-500 -outline-offset-2"
                : ""
            }`}
            aria-busy={isLoading}
            aria-live={isLoading ? "polite" : "off"}
          >
            <div
              ref={contentRef}
              className="flex flex-1 min-h-0 min-w-0 flex-col overflow-auto py-4 px-4"
            >
              {hasBatches && currentBatch && (
                <>
                  <div className="flex justify-center mb-6">
                    <button
                      type="button"
                      onClick={() => currentBatch?.description && setBatchModalIndex(selectedBatchIndex)}
                      className={`rounded px-6 py-2.5 text-base font-black text-white cursor-pointer transition-opacity ${
                        currentBatch?.description ? "hover:opacity-90 cursor-pointer" : "cursor-default"
                      }`}
                      style={{
                        backgroundColor: "rgba(21,128,61,0.85)",
                        border: "1.5px solid rgb(21,128,61)",
                      }}
                    >
                      {currentBatch?.promptSummary ?? `Batch ${selectedBatchIndex + 1}`}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 flex-1 auto-rows-min">
                    {batchNodes.map((node) => {
                      const isSelected = selectedNodeIds.has(node.id);
                      const isHovered = hoveredNode?.id === node.id;
                      const showDescription = isHovered && node.description;
                      return (
                        <div
                          key={node.id}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                          onClick={() => onToggleNodeSelection?.(node.id)}
                          className={`
                            rounded-lg p-4 min-h-[80px] transition-colors border-2
                            ${onToggleNodeSelection ? "cursor-pointer" : "cursor-default"}
                            ${
                              isSelected
                                ? "bg-violet-500 dark:bg-violet-600 border-violet-600 dark:border-violet-500 text-white shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                                : "bg-white dark:bg-zinc-800 border-transparent text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                            }
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xl font-semibold flex-1">
                              {node.name}
                            </span>
                            {isSelected && (
                              <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 dark:bg-violet-500 flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M8 12l4 4 8-8" />
                                </svg>
                              </span>
                            )}
                          </div>
                          {node.description && showDescription && (
                            <p
                              className={`text-sm mt-2 leading-relaxed ${
                                isSelected ? "text-white/90" : "text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              {node.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          {hasBatches && (
            <div
              ref={stepperRef}
              className="relative z-10 flex items-center justify-center gap-3 py-2 px-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0"
            >
              <button
                type="button"
                onClick={() => setSelectedBatchIndex((i) => Math.max(0, i - 1))}
                disabled={!canGoPrev}
                aria-label="Previous batch"
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors select-none ${
                  canGoPrev
                    ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 cursor-pointer active:scale-95"
                    : "text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50"
                }`}
              >
                ← Prev
              </button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums min-w-16 text-center">
                {selectedBatchIndex + 1} / {batches.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedBatchIndex((i) => Math.min(batches.length - 1, i + 1))}
                disabled={!canGoNext}
                aria-label="Next batch"
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors select-none ${
                  canGoNext
                    ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 cursor-pointer active:scale-95"
                    : "text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50"
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
