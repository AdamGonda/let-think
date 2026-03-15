import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";

type GraphNode = {
  id: string;
  name: string;
  description?: string;
};

export type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{ id: string; nodeIds: string[] }>;
};

const NODE_PAD = 40;
const NODE_GAP = 24;
const CLUSTER_PAD = 40;
const CLUSTER_GAP = 80;
const BATCH_HEADER = 44;
const ARROW_SIZE = 8;
const MIN_NODE_WIDTH = 340;
const NODE_HEIGHT = 84;

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
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

export function ConceptGraphOverlay({ graph, className }: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ clientX: number; clientY: number } | null>(null);
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

  // Visible batches: prev (if any), center, next (if any)
  const visibleBatches = useMemo(() => {
    const result: Array<{ batch: (typeof batches)[0]; index: number; role: "prev" | "center" | "next" }> = [];
    if (batches.length === 0) return result;
    const curr = batches[selectedBatchIndex];
    if (!curr) return result;

    if (canGoPrev) {
      result.push({ batch: batches[selectedBatchIndex - 1]!, index: selectedBatchIndex - 1, role: "prev" });
    }
    result.push({ batch: curr, index: selectedBatchIndex, role: "center" });
    if (canGoNext) {
      result.push({ batch: batches[selectedBatchIndex + 1]!, index: selectedBatchIndex + 1, role: "next" });
    }
    return result;
  }, [batches, selectedBatchIndex, canGoPrev, canGoNext]);

  // Compute layout: 3 clusters max (prev | center | next), centered in viewport
  const layout = useMemo(() => {
    const clusters: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      role: "prev" | "center" | "next";
      batchIndex: number;
      nodes: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }>;
    }> = [];
    const font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    // First compute dimensions for each visible batch
    const clusterDims: Array<{ width: number; height: number; nodes: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }> }> = [];

    for (const { batch } of visibleBatches) {
      const batchNodes = batch.nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is GraphNode => n != null);

      if (batchNodes.length === 0) {
        clusterDims.push({ width: 120, height: 80, nodes: [] });
        continue;
      }

      const nodeLayouts: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }> = [];
      let cy = BATCH_HEADER + CLUSTER_PAD;
      let maxW = 0;

      for (const node of batchNodes) {
        const { width: w, height: h } = measureText(node.name, font);
        nodeLayouts.push({ node, x: CLUSTER_PAD, y: cy, w, h });
        maxW = Math.max(maxW, w + CLUSTER_PAD * 2);
        cy += h + NODE_GAP;
      }

      const clusterHeight = cy - NODE_GAP + CLUSTER_PAD;
      const clusterWidth = maxW + CLUSTER_PAD;
      const nodeFullWidth = clusterWidth - 2 * CLUSTER_PAD;

      clusterDims.push({
        width: clusterWidth,
        height: clusterHeight,
        nodes: nodeLayouts.map((nl) => ({ ...nl, w: nodeFullWidth, h: nl.h })),
      });
    }

    // Position clusters: center batch at viewport center, prev to left, next to right (neighbors partially visible)
    const maxHeight = Math.max(...clusterDims.map((d) => d.height), 100);
    const centerIdx = visibleBatches.findIndex((vb) => vb.role === "center");
    const centerDims = centerIdx >= 0 ? clusterDims[centerIdx]! : null;

    const viewportCenterX = dimensions.width / 2;
    const centerClusterWidth = centerDims?.width ?? 200;
    const centerX = viewportCenterX - centerClusterWidth / 2;

    let x = 0;
    visibleBatches.forEach((vb, i) => {
      const dims = clusterDims[i]!;
      if (vb.role === "prev") {
        x = centerX - dims.width - CLUSTER_GAP;
      } else if (vb.role === "center") {
        x = centerX;
      } else if (vb.role === "next") {
        x = centerX + centerClusterWidth + CLUSTER_GAP;
      }

      clusters.push({
        x,
        y: Math.max(CLUSTER_PAD, (dimensions.height - dims.height) / 2),
        width: dims.width,
        height: dims.height,
        role: vb.role,
        batchIndex: vb.index,
        nodes: dims.nodes.map((nl) => ({
          ...nl,
          x: nl.x + x,
          y: nl.y + Math.max(CLUSTER_PAD, (dimensions.height - dims.height) / 2),
          w: nl.w,
          h: nl.h,
        })),
      });
    });

    const contentMinX = clusters.length > 0 ? Math.min(...clusters.map((c) => c.x)) : 0;
    const contentMaxX = clusters.length > 0 ? Math.max(...clusters.map((c) => c.x + c.width)) : dimensions.width;
    const contentWidth = Math.max(dimensions.width, contentMaxX - contentMinX + CLUSTER_PAD * 2);
    const centerCluster = clusters.find((c) => c.role === "center");
    const centerClusterCenter = centerCluster ? centerCluster.x + centerCluster.width / 2 : dimensions.width / 2;
    const translateX = dimensions.width / 2 - centerClusterCenter;

    return {
      clusters,
      totalWidth: contentWidth,
      totalHeight: Math.max(dimensions.height, maxHeight + CLUSTER_PAD * 2),
      translateX,
    };
  }, [visibleBatches, nodeMap, dimensions]);

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


  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (hoveredNode) {
        setTooltipPos({ clientX: e.clientX, clientY: e.clientY });
      }
    },
    [hoveredNode]
  );

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredNode(null);
        setTooltipPos(null);
      }}
    >
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
          Type a message to build your concept graph
        </div>
      ) : (
        <>
        <div
          ref={graphViewportRef}
          className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative"
        >
          <svg
            ref={svgRef}
            width={layout.totalWidth}
            height={Math.max(dimensions.height, layout.totalHeight)}
            className="min-h-full"
            style={{
              minWidth: dimensions.width,
              transform: `translateX(${layout.translateX}px)`,
              transformOrigin: "0 0",
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
                  key={`flow-${i}`}
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
            {layout.clusters.map((cluster, ci) => {
              const isCenter = cluster.role === "center";
              const isDimmed = cluster.role !== "center";
              return (
                <g
                  key={`cluster-${ci}`}
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
                  <text
                    x={cluster.x + cluster.width / 2}
                    y={cluster.y + 12}
                    textAnchor="middle"
                    className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-medium"
                  >
                    {cluster.role === "prev" && "← "}
                    Batch {cluster.batchIndex + 1}
                    {cluster.role === "next" && " →"}
                  </text>
                  {cluster.nodes.map(({ node, x, y, w, h }) => (
                    <g
                      key={node.id}
                      onMouseEnter={(e) => {
                        setHoveredNode(node);
                        setTooltipPos({ clientX: e.clientX, clientY: e.clientY });
                      }}
                      onMouseLeave={() => {
                        setHoveredNode(null);
                        setTooltipPos(null);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={4}
                        ry={4}
                        fill={isCenter ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)"}
                        stroke={isCenter ? "rgba(139,92,246,0.8)" : "rgba(139,92,246,0.45)"}
                        strokeWidth={isCenter ? 1.5 : 1}
                        className="dark:fill-zinc-800 dark:stroke-violet-500"
                        style={isDimmed ? { opacity: 0.85 } : undefined}
                      />
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-zinc-800 dark:fill-zinc-200 text-xl font-semibold"
                        style={isDimmed ? { opacity: 0.9 } : undefined}
                      >
                        {node.name}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
        {hasBatches && (
          <div className="relative z-10 flex items-center justify-center gap-3 py-2 px-3 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
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

      {hoveredNode &&
        tooltipPos &&
        (hoveredNode.description ?? hoveredNode.name) &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-none max-w-[360px] rounded-lg border-2 border-zinc-500 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-lg px-4 py-3 text-2xl font-bold text-zinc-800 dark:text-zinc-200"
            style={{
              left: tooltipPos.clientX + 8,
              top: tooltipPos.clientY + 4,
            }}
          >
            {hoveredNode.description ?? hoveredNode.name}
          </div>,
          document.body
        )}
    </div>
  );
}
