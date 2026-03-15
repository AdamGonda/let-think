import { useRef, useEffect, useState, useMemo } from "react";

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
const CLUSTER_PAD = 48;
const CLUSTER_GAP = 120;
const BATCH_HEADER = 44;
const VIEWPORT_PADDING = 32;
const ARROW_SIZE = 8;
const MIN_NODE_WIDTH = 420;
const NODE_HEIGHT = 100;
const NODE_HEIGHT_EXPANDED = 200;

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
  selectedNodeIds?: Set<string>;
  onToggleNodeSelection?: (nodeId: string) => void;
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
}: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);

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
    const font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    // Compute dimensions for ALL batches (stable rail)
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

      const nodeLayouts: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }> = [];
      let cy = BATCH_HEADER + CLUSTER_PAD;
      let maxW = 0;

      for (const node of batchNodes) {
        const { width: w } = measureText(node.name, font);
        const h = node.description ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT;
        nodeLayouts.push({ node, x: CLUSTER_PAD, y: cy, w, h });
        maxW = Math.max(maxW, w + CLUSTER_PAD * 2);
        cy += h + NODE_GAP;
      }

      const clusterHeight = cy - NODE_GAP + CLUSTER_PAD;
      const clusterWidth = maxW + CLUSTER_PAD;
      const nodeFullWidth = clusterWidth - 2 * CLUSTER_PAD;

      allDims.push({
        width: clusterWidth,
        height: clusterHeight,
        nodes: nodeLayouts.map((nl) => ({ ...nl, w: nodeFullWidth, h: nl.h })),
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
    // Center the cluster in the visible content area (px-8 padding reduces the content box)
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

    const contentHeight = dimensions.height - 48; // py-6 = 24px top + bottom
    let x = VIEWPORT_PADDING;
    for (let i = 0; i < batches.length; i++) {
      const dims = allDims[i]!;
      const role: "prev" | "center" | "next" =
        i < selectedBatchIndex ? "prev" : i > selectedBatchIndex ? "next" : "center";
      const clusterY = Math.max(CLUSTER_PAD, (contentHeight - dims.height) / 2);

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
        <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
          Type a message to build your concept graph
        </div>
      ) : (
        <>
        <div
          ref={graphViewportRef}
          className="flex flex-1 min-h-0 min-w-0 overflow-auto relative py-6 px-8"
        >
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
            <defs>
              <marker
                id="flow-arrow"
                markerWidth={ARROW_SIZE}
                markerHeight={ARROW_SIZE}
                refX={ARROW_SIZE}
                refY={ARROW_SIZE / 2}
                orient="auto"
              >
                <path
                  d={`M0,0 L${ARROW_SIZE},${ARROW_SIZE / 2} L0,${ARROW_SIZE} z`}
                  fill="rgba(139,92,246,0.6)"
                />
              </marker>
            </defs>

            {/* Flow connectors: arrow from each cluster to the next */}
            {layout.clusters.slice(0, -1).map((curr, i) => {
              const next = layout.clusters[i + 1];
              if (!next) return null;
              const fromX = curr.x + curr.width;
              const fromY = curr.y + curr.height / 2;
              const toX = next.x;
              const toY = next.y + next.height / 2;
              const midX = (fromX + toX) / 2;
              return (
                <path
                  key={`flow-${curr.batchIndex}-${next.batchIndex}`}
                  d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="rgba(139,92,246,0.5)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  markerEnd="url(#flow-arrow)"
                />
              );
            })}

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
                  <rect
                    x={cluster.x}
                    y={cluster.y}
                    width={cluster.width}
                    height={cluster.height}
                    rx={8}
                    ry={8}
                    fill={isCenter ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.05)"}
                    stroke={isCenter ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.25)"}
                    strokeWidth={isCenter ? 2 : 1}
                  />
                  {(() => {
                    const batch = batches[cluster.batchIndex];
                    const label =
                      (cluster.role === "prev" ? "← " : "") +
                      (batch?.promptSummary ?? `Batch ${cluster.batchIndex + 1}`) +
                      (cluster.role === "next" ? " →" : "");
                    const padX = 18;
                    const boxW = Math.max(80, label.length * 10 + padX * 2);
                    const boxH = 36;
                    const cx = cluster.x + cluster.width / 2;
                    const cy = cluster.y + 30;
                    return (
                      <g>
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
                          {label}
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
                        stroke={
                          isSelected
                            ? "rgba(139,92,246,1)"
                            : isCenter
                              ? "rgba(139,92,246,0.8)"
                              : "rgba(139,92,246,0.45)"
                        }
                        strokeWidth={isSelected ? 4 : isCenter ? 1.5 : 1}
                        className={isSelected ? "" : "dark:fill-zinc-800 dark:stroke-violet-500"}
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
                            className={`text-sm leading-snug ${isSelected ? "text-white/90" : "text-zinc-600 dark:text-zinc-400"}`}
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
            className="relative z-10 flex items-center justify-center gap-3 py-2 px-8 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0"
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
