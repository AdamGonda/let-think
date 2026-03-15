import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";

type GraphNode = {
  id: string;
  name: string;
  description?: string;
};

export type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{ id: string; nodeIds: string[]; promptSummary?: string }>;
};

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
}

const BATCH_ANIMATION_MS = 400;
const HIGHLIGHT_COLOR = "rgba(139,92,246,0.9)";
const DIM_COLOR = "rgba(139,92,246,0.25)";
const DIM_OPACITY = 0.4;

export function ConceptGraphOverlay({ graph, className }: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, { source: string; target: string }>>(null!);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ clientX: number; clientY: number } | null>(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

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

  const selectedBatchNodeIds = useMemo(() => {
    const batch = batches[selectedBatchIndex];
    return batch ? new Set(batch.nodeIds) : new Set<string>();
  }, [batches, selectedBatchIndex]);

  // Graph data for force-graph
  const graphData = useMemo(() => {
    if (!graph?.nodes?.length) return { nodes: [], links: [] };
    const nodes = graph.nodes.map((n) => ({ ...n }));
    const links = (graph.edges ?? []).map((e) => ({
      source: e.source,
      target: e.target,
    }));
    return { nodes, links };
  }, [graph?.nodes, graph?.edges]);

  // When a new batch arrives, jump to it
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

  // Zoom to fit selected batch
  const zoomToSelectedBatch = useCallback(() => {
    if (!graphRef.current || batches.length === 0) return;
    const batch = batches[selectedBatchIndex];
    if (batch && batch.nodeIds.length > 0) {
      const nodeIds = new Set(batch.nodeIds);
      graphRef.current.zoomToFit(BATCH_ANIMATION_MS, 80, (node) =>
        nodeIds.has(typeof node.id === "string" ? node.id : String(node.id))
      );
    } else if (graphData.nodes.length > 0) {
      graphRef.current.zoomToFit(BATCH_ANIMATION_MS, 80);
    }
  }, [batches, selectedBatchIndex, graphData.nodes.length]);

  // Zoom when batch changes or on mount (prevBatchIndexRef=-1 forces run when graph is ready)
  const prevBatchIndexRef = useRef(-1);
  useEffect(() => {
    if (isEmpty || batches.length === 0 || !dimensions) return;
    if (prevBatchIndexRef.current !== selectedBatchIndex) {
      prevBatchIndexRef.current = selectedBatchIndex;
      const id = setTimeout(() => zoomToSelectedBatch(), 50);
      return () => clearTimeout(id);
    }
  }, [selectedBatchIndex, batches, isEmpty, dimensions, zoomToSelectedBatch]);

  // Fallback: zoom when simulation settles
  const hasInitialZoomedRef = useRef(false);
  const handleEngineStop = useCallback(() => {
    if (isEmpty || hasInitialZoomedRef.current) return;
    hasInitialZoomedRef.current = true;
    setTimeout(() => {
      if (graphRef.current) zoomToSelectedBatch();
    }, 100);
  }, [isEmpty, zoomToSelectedBatch]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
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
          <div className="flex flex-1 min-h-0 min-w-0 relative">
            {dimensions ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="transparent"
              nodeId="id"
              linkSource="source"
              linkTarget="target"
              nodeLabel={(node) => (node as GraphNode).description ?? (node as GraphNode).name}
              nodeColor={(node) =>
                selectedBatchNodeIds.has((node as { id: string }).id) ? HIGHLIGHT_COLOR : DIM_COLOR
              }
              nodeVal={(node) => (selectedBatchNodeIds.has((node as { id: string }).id) ? 12 : 6)}
              linkColor="rgba(139,92,246,0.4)"
              linkWidth={1}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowColor="rgba(139,92,246,0.5)"
              onNodeHover={(node) => {
                const n = node as GraphNode | null;
                setHoveredNode(n);
              }}
              onEngineStop={handleEngineStop}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const id = (node as { id: string }).id;
                const label = (node as GraphNode).name;
                const isHighlighted = selectedBatchNodeIds.has(id);
                const fontSize = 12 / globalScale;
                ctx.font = `${isHighlighted ? "bold" : ""} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

                const dim = ctx.measureText(label);
                const pad = 8 / globalScale;
                const w = dim.width + pad * 2;
                const h = 20 / globalScale;
                const x = (node.x ?? 0) - w / 2;
                const y = (node.y ?? 0) - h / 2;

                ctx.fillStyle = isHighlighted ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)";
                ctx.strokeStyle = isHighlighted ? "rgba(139,92,246,0.8)" : "rgba(139,92,246,0.45)";
                ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 1 / globalScale;
                ctx.globalAlpha = isHighlighted ? 1 : DIM_OPACITY;
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, 4 / globalScale);
                ctx.fill();
                ctx.stroke();
                ctx.globalAlpha = 1;

                ctx.fillStyle = "rgb(39, 39, 42)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, (node.x ?? 0), node.y ?? 0);
              }}
              nodeCanvasObjectMode="replace"
              nodePointerAreaPaint={(node, color, ctx, globalScale) => {
                const label = (node as GraphNode).name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px -apple-system, sans-serif`;
                const dim = ctx.measureText(label);
                const pad = 8 / globalScale;
                const w = dim.width + pad * 2;
                const h = 20 / globalScale;
                const x = (node.x ?? 0) - w / 2;
                const y = (node.y ?? 0) - h / 2;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, 4 / globalScale);
                ctx.fill();
              }}
            />
            ) : null}
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
            className="fixed z-[9999] pointer-events-none max-w-[360px] rounded-lg border-2 border-zinc-500 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-lg px-4 py-3 text-2xl font-bold text-zinc-800 dark:text-zinc-200"
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
