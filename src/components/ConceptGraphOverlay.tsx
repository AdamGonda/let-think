import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

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

const NODE_PAD = 48;
const NODE_GAP = 32;
const CLUSTER_PAD = 24;
const CLUSTER_GAP = 120;
const BATCH_HEADER = 40;
const BATCH_HEADER_GAP = 56;
const VIEWPORT_PADDING = 0;
const MIN_NODE_WIDTH = 420;
const NODE_HEIGHT = 100;
const NODE_HEIGHT_EXPANDED = 200;
const GRID_COLS = 3;
const MIN_CELL_WIDTH = 200;
const MIN_CELL_HEIGHT = 80;

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
  selectedNodeIds?: Set<string>;
  onToggleNodeSelection?: (nodeId: string) => void;
  modalContainerRef?: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
}

function measureText(text: string, font: string): { width: number; height: number } {
  if (typeof document === "undefined") return { width: MIN_NODE_WIDTH, height: NODE_HEIGHT };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 60, height: 20 };
  ctx.font = font;
  const metrics = ctx.measureText(text);
  return {
    width: Math.max(MIN_NODE_WIDTH, metrics.width + NODE_PAD * 2),
    height: NODE_HEIGHT,
  };
}

export function ConceptGraphOverlay({
  graph,
  className,
  selectedNodeIds = new Set(),
  onToggleNodeSelection,
  modalContainerRef,
  isLoading = false,
}: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [batchModalIndex, setBatchModalIndex] = useState<number | null>(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);

  // Align modal x with graph viewport center (fixes offset when portaled to main content)
  const [modalLeft, setModalLeft] = useState<number | null>(null);
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

  // Compute a STABLE full rail layout for ALL batches. Cluster positions stay fixed;
  // only translateX changes when navigating, enabling smooth CSS transition.
  const layout = useMemo(() => {
    const gridAreaWidth = dimensions.width - 2 * VIEWPORT_PADDING - 2 * CLUSTER_PAD;
    const gridAreaHeight = dimensions.height - 32 - BATCH_HEADER - BATCH_HEADER_GAP - CLUSTER_PAD;

    const maxNumRows = Math.max(
      1,
      ...batches.map((b) => Math.ceil((b.nodeIds?.length ?? 0) / GRID_COLS))
    );
    const cellWidth = Math.max(
      MIN_CELL_WIDTH,
      (gridAreaWidth - (GRID_COLS - 1) * NODE_GAP) / GRID_COLS
    );
    const cellHeight = Math.max(
      MIN_CELL_HEIGHT,
      (gridAreaHeight - (maxNumRows - 1) * NODE_GAP) / maxNumRows
    );

    const allDims: Array<{
      width: number;
      height: number;
      nodes: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }>;
    }> = [];

    for (const batch of batches) {
      const batchNodes = batch.nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is GraphNode => n != null);

      if (batchNodes.length === 0) {
        allDims.push({ width: 120, height: 80, nodes: [] });
        continue;
      }

      const numRows = Math.ceil(batchNodes.length / GRID_COLS);
      const rowHeights: number[] = [];
      for (let r = 0; r < numRows; r++) {
        let maxH = 0;
        for (let c = 0; c < GRID_COLS; c++) {
          const i = r * GRID_COLS + c;
          if (i >= batchNodes.length) break;
          const node = batchNodes[i]!;
          const h = node.description ? Math.max(cellHeight, NODE_HEIGHT_EXPANDED) : cellHeight;
          maxH = Math.max(maxH, h);
        }
        rowHeights.push(maxH);
      }

      const nodeLayouts: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }> = [];
      let cy = BATCH_HEADER + BATCH_HEADER_GAP;
      for (let i = 0; i < batchNodes.length; i++) {
        const node = batchNodes[i]!;
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const x = CLUSTER_PAD + col * (cellWidth + NODE_GAP);
        const y = cy;
        const h = node.description ? Math.max(cellHeight, NODE_HEIGHT_EXPANDED) : cellHeight;
        nodeLayouts.push({ node, x, y, w: cellWidth, h });
        if (col === GRID_COLS - 1) {
          cy += rowHeights[row]! + NODE_GAP;
        }
      }
      const clusterHeight = cy - NODE_GAP + CLUSTER_PAD;
      const clusterWidth = GRID_COLS * cellWidth + (GRID_COLS - 1) * NODE_GAP + 2 * CLUSTER_PAD;

      allDims.push({
        width: clusterWidth,
        height: clusterHeight,
        nodes: nodeLayouts,
      });
    }

    if (allDims.length === 0) {
      return {
        clusters: [],
        totalWidth: dimensions.width,
        totalHeight: dimensions.height,
        translateX: 0,
      };
    }

    // Build full rail: fixed x positions for every batch (stable across navigation)
    const maxHeight = Math.max(...allDims.map((d) => d.height), 100);
    // Center the cluster in the visible content area (px-4 padding reduces the content box)
    const contentWidth = dimensions.width - 2 * VIEWPORT_PADDING;
    const viewportCenterX = contentWidth / 2;

    const allClusters: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      role: "prev" | "center" | "next";
      batchIndex: number;
      nodes: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }>;
    }> = [];

    let x = VIEWPORT_PADDING;
    for (let i = 0; i < batches.length; i++) {
      const dims = allDims[i]!;
      const role: "prev" | "center" | "next" =
        i < selectedBatchIndex ? "prev" : i > selectedBatchIndex ? "next" : "center";
      const clusterY = VIEWPORT_PADDING;

      allClusters.push({
        x,
        y: clusterY,
        width: dims.width,
        height: dims.height,
        role,
        batchIndex: i,
        nodes: dims.nodes.map((nl) => ({
          ...nl,
          x: nl.x + x,
          y: nl.y + clusterY,
          w: nl.w,
          h: nl.h,
        })),
      });
      x += dims.width + CLUSTER_GAP;
    }

    // Only include prev, center, next for rendering (3 max)
    const prevIdx = selectedBatchIndex - 1;
    const nextIdx = selectedBatchIndex + 1;
    const indicesToRender = [
      ...(prevIdx >= 0 ? [prevIdx] : []),
      selectedBatchIndex,
      ...(nextIdx < batches.length ? [nextIdx] : []),
    ];
    const clusters = indicesToRender.map((i) => allClusters[i]!);

    const contentMaxX = allClusters.length > 0 ? allClusters[allClusters.length - 1]!.x + allClusters[allClusters.length - 1]!.width : dimensions.width;
    const totalWidth = Math.max(dimensions.width, contentMaxX + VIEWPORT_PADDING);

    const centerCluster = allClusters[selectedBatchIndex];
    const centerClusterCenter = centerCluster ? centerCluster.x + centerCluster.width / 2 : viewportCenterX;
    const translateX = viewportCenterX - centerClusterCenter;

    return {
      clusters,
      totalWidth,
      totalHeight: Math.max(dimensions.height, maxHeight + CLUSTER_PAD * 2),
      translateX,
    };
  }, [batches, selectedBatchIndex, nodeMap, dimensions]);

  useEffect(() => {
    const el = graphViewportRef.current ?? containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const target = graphViewportRef.current ?? containerRef.current;
      if (target) {
        setDimensions({ width: target.clientWidth, height: target.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isEmpty]);

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400 text-base py-6 px-6 transition-colors duration-200 ${
            isLoading
              ? "outline-2 outline-violet-600 dark:outline-violet-500 -outline-offset-2 rounded-lg"
              : ""
          }`}
          aria-busy={isLoading}
          aria-live={isLoading ? "polite" : "off"}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-8 w-8 text-violet-600 dark:text-violet-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Thinking</span>
            </>
          ) : (
            "Type a message to build your concept graph"
          )}
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
          ref={graphViewportRef}
          className={`flex flex-1 min-h-0 min-w-0 overflow-hidden relative py-4 touch-none transition-colors duration-200 ${
            isLoading
              ? "outline-2 outline-violet-600 dark:outline-violet-500 -outline-offset-2 rounded-lg"
              : ""
          }`}
          aria-busy={isLoading}
          aria-live={isLoading ? "polite" : "off"}
        >
          {isLoading && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-[#16171d]/80 backdrop-blur-[1px]"
              aria-hidden
            >
              <svg
                className="animate-spin h-8 w-8 text-violet-600 dark:text-violet-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-zinc-600 dark:text-zinc-400 text-base">Thinking</span>
            </div>
          )}
          <div
            className="inline-block"
            style={{
              transform: `translate3d(${layout.translateX}px, 0, 0)`,
              transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
              willChange: "transform",
            }}
          >
          <svg
            ref={svgRef}
            width={layout.totalWidth}
            height={Math.max(dimensions.height, layout.totalHeight)}
            className="min-h-full block"
            style={{
              minWidth: dimensions.width,
            }}
          >
            {/* Cluster backgrounds and nodes */}
            {layout.clusters.map((cluster) => {
              const isCenter = cluster.role === "center";
              const isDimmed = cluster.role !== "center";
              return (
                <g
                  key={`cluster-${cluster.batchIndex}`}
                  onClick={
                    isDimmed
                      ? () => setSelectedBatchIndex(cluster.batchIndex)
                      : undefined
                  }
                  style={isDimmed ? { cursor: "pointer" } : undefined}
                >
                  {(() => {
                    const batch = batches[cluster.batchIndex];
                    const summary =
                      (cluster.role === "prev" ? "← " : "") +
                      (batch?.promptSummary ?? `Batch ${cluster.batchIndex + 1}`) +
                      (cluster.role === "next" ? " →" : "");
                    const padX = 18;
                    const boxW = Math.max(80, summary.length * 10 + padX * 2);
                    const boxH = 36;
                    const cx = cluster.x + cluster.width / 2;
                    const cy = cluster.y + 30;
                    return (
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          if (batch?.description) {
                            setBatchModalIndex(cluster.batchIndex);
                            if (isDimmed) setSelectedBatchIndex(cluster.batchIndex);
                          }
                        }}
                        style={{ cursor: batch?.description ? "pointer" : undefined }}
                      >
                        <rect
                          x={cx - boxW / 2}
                          y={cy - boxH / 2}
                          width={boxW}
                          height={boxH}
                          rx={4}
                          ry={4}
                          fill={isCenter ? "rgba(21,128,61,0.85)" : "rgba(21,128,61,0.75)"}
                          stroke={isCenter ? "rgba(21,128,61,1)" : "rgba(21,128,61,0.9)"}
                          strokeWidth={isCenter ? 1.5 : 1}
                          style={isDimmed ? { opacity: 0.85 } : undefined}
                        />
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-white text-base font-black"
                          style={isDimmed ? { opacity: 0.9 } : undefined}
                        >
                          {summary}
                        </text>
                      </g>
                    );
                  })()}
                  {cluster.nodes.map(({ node, x, y, w, h }) => {
                    const isSelected = selectedNodeIds.has(node.id);
                    const isHovered = hoveredNode?.id === node.id;
                    const showDescription = isHovered && node.description;
                    return (
                    <g
                      key={node.id}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNodeSelection?.(node.id);
                      }}
                      style={{ cursor: onToggleNodeSelection ? "pointer" : undefined }}
                    >
                      {isSelected && (
                        <rect
                          x={x - 3}
                          y={y - 3}
                          width={w + 6}
                          height={h + 6}
                          rx={6}
                          ry={6}
                          fill="none"
                          stroke="rgba(139,92,246,0.9)"
                          strokeWidth={4}
                          style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.6))" }}
                        />
                      )}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={4}
                        ry={4}
                        fill={
                          isSelected
                            ? "rgba(139,92,246,0.6)"
                            : isCenter
                              ? "rgba(255,255,255,0.98)"
                              : "rgba(255,255,255,0.85)"
                        }
                        stroke={isSelected ? "rgba(139,92,246,1)" : "none"}
                        strokeWidth={isSelected ? 4 : 0}
                        className={isSelected ? "" : "dark:fill-zinc-800"}
                        style={isDimmed && !isSelected ? { opacity: 0.85 } : undefined}
                      />
                      {isSelected && (
                        <g transform={`translate(${x + w - 28}, ${y + 12})`}>
                          <circle cx={14} cy={10} r={12} fill="rgba(139,92,246,1)" />
                          <path
                            d="M8 10l4 4 8-8"
                            fill="none"
                            stroke="white"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                      <g style={{ pointerEvents: "none" }}>
                        <text
                          x={x + w / 2}
                          y={y + h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`text-xl font-semibold ${isSelected ? "fill-white" : "fill-zinc-800 dark:fill-zinc-200"}`}
                          style={{
                            opacity: showDescription ? 0 : isDimmed && !isSelected ? 0.9 : 1,
                            transition: "opacity 200ms ease-out",
                            ...(isSelected ? { textShadow: "0 1px 2px rgba(0,0,0,0.4)" } : {}),
                          }}
                        >
                          {node.name}
                        </text>
                        <text
                          x={x + 24}
                          y={y + 20}
                          textAnchor="start"
                          dominantBaseline="hanging"
                          className={`text-xl font-semibold ${isSelected ? "fill-white" : "fill-zinc-800 dark:fill-zinc-200"}`}
                          style={{
                            opacity: showDescription ? (isDimmed && !isSelected ? 0.9 : 1) : 0,
                            transition: "opacity 200ms ease-out",
                            ...(isSelected ? { textShadow: "0 1px 2px rgba(0,0,0,0.4)" } : {}),
                          }}
                        >
                          {node.name}
                        </text>
                      </g>
                      {node.description && (
                        <foreignObject
                          x={x + 24}
                          y={y + 44}
                          width={w - 48}
                          height={h - 52}
                          className="overflow-y-auto overflow-x-hidden"
                          style={{
                            opacity: showDescription ? 1 : 0,
                            transform: showDescription ? "translateY(0)" : "translateY(-8px)",
                            transition: "opacity 200ms ease-out, transform 200ms ease-out",
                            pointerEvents: showDescription ? "auto" : "none",
                          }}
                        >
                          <div
                            className={`text-xl leading-tight ${isSelected ? "text-white/90" : "text-zinc-600 dark:text-zinc-400"}`}
                            style={{
                              width: "100%",
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {node.description}
                          </div>
                        </foreignObject>
                      )}
                    </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
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
