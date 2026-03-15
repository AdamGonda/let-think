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

const NODE_PAD = 8;
const NODE_GAP = 6;
const CLUSTER_PAD = 16;
const CLUSTER_GAP = 48;
const BATCH_HEADER = 20;
const ARROW_SIZE = 8;
const MIN_NODE_WIDTH = 60;

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
}

function measureText(text: string, font: string): { width: number; height: number } {
  if (typeof document === "undefined") return { width: 60, height: 20 };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 60, height: 20 };
  ctx.font = font;
  const metrics = ctx.measureText(text);
  return {
    width: Math.max(MIN_NODE_WIDTH, metrics.width + NODE_PAD * 2),
    height: 20,
  };
}

export function ConceptGraphOverlay({ graph, className }: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ clientX: number; clientY: number } | null>(null);

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

  // Compute layout: clusters in a horizontal flow
  const layout = useMemo(() => {
    const clusters: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      nodes: Array<{ node: GraphNode; x: number; y: number; w: number; h: number }>;
    }> = [];
    const font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    let x = CLUSTER_PAD;
    let maxHeight = 0;

    for (const batch of batches) {
      const batchNodes = batch.nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is GraphNode => n != null);

      if (batchNodes.length === 0) continue;

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

      clusters.push({
        x,
        y: CLUSTER_PAD,
        width: clusterWidth,
        height: clusterHeight,
        nodes: nodeLayouts.map((nl) => ({
          ...nl,
          x: nl.x + x,
          y: nl.y + CLUSTER_PAD,
          w: nl.w,
          h: nl.h,
        })),
      });

      x += clusterWidth + CLUSTER_GAP;
      maxHeight = Math.max(maxHeight, clusterHeight);
    }

    return {
      clusters,
      totalWidth: x - CLUSTER_GAP + CLUSTER_PAD,
      totalHeight: maxHeight + CLUSTER_PAD * 2,
    };
  }, [batches, nodeMap]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (hoveredNode) {
        setTooltipPos({ clientX: e.clientX, clientY: e.clientY });
      }
    },
    [hoveredNode]
  );

  const isEmpty = !graph?.nodes?.length;

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
        <div className="flex flex-1 min-h-0 min-w-0 overflow-auto">
          <svg
            ref={svgRef}
            width={Math.max(dimensions.width, layout.totalWidth)}
            height={Math.max(dimensions.height, layout.totalHeight)}
            className="min-w-full min-h-full"
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
            {layout.clusters.map((cluster, ci) => (
              <g key={`cluster-${ci}`}>
                <rect
                  x={cluster.x}
                  y={cluster.y}
                  width={cluster.width}
                  height={cluster.height}
                  rx={8}
                  ry={8}
                  fill="rgba(139,92,246,0.08)"
                  stroke="rgba(139,92,246,0.3)"
                  strokeWidth={1}
                />
                <text
                  x={cluster.x + cluster.width / 2}
                  y={cluster.y + 12}
                  textAnchor="middle"
                  className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-medium"
                >
                  Batch {ci + 1}
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
                      fill="rgba(255,255,255,0.95)"
                      stroke="rgba(139,92,246,0.7)"
                      strokeWidth={1.5}
                      className="dark:fill-zinc-800 dark:stroke-violet-500"
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-zinc-800 dark:fill-zinc-200 text-xs font-semibold"
                    >
                      {node.name}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>
      )}

      {hoveredNode &&
        tooltipPos &&
        (hoveredNode.description ?? hoveredNode.name) &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-none max-w-[280px] rounded-lg border-2 border-zinc-500 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
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
