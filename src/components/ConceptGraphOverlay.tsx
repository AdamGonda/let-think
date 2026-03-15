import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-2d";

type GraphNode = { id?: string; name?: string; description?: string; x?: number; y?: number };

export type ConceptGraphData = {
  nodes: Array< { id: string; name: string; description?: string } >;
  edges: Array< { source: string; target: string } >;
  batches?: Array< { id: string; nodeIds: string[] } >;
};

function toForceGraphData(data: ConceptGraphData | null) {
  if (!data || data.nodes.length === 0) return { nodes: [], links: [] };
  return {
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target })),
  };
}

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
}

export function ConceptGraphOverlay({ graph, className }: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphAreaRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const fgRef = useRef<ForceGraphMethods<NodeObject, { source: string; target: string }> | null>(null);
  const batches = graph?.batches ?? [];
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Sync selectedBatchIndex with batches (default to last batch, clamp when out of bounds)
  useEffect(() => {
    if (batches.length === 0) {
      setSelectedBatchIndex(null);
    } else if (selectedBatchIndex === null) {
      setSelectedBatchIndex(batches.length - 1);
    } else if (selectedBatchIndex > batches.length) {
      setSelectedBatchIndex(batches.length);
    } else if (selectedBatchIndex < 0) {
      setSelectedBatchIndex(0);
    }
  }, [batches.length, selectedBatchIndex]);

  const effectiveBatchIndex =
    selectedBatchIndex ?? (batches.length > 0 ? batches.length - 1 : null);
  const isViewingAll =
    effectiveBatchIndex != null && effectiveBatchIndex >= batches.length;
  const highlightedNodeIds = new Set(
    isViewingAll && graph
      ? graph.nodes.map((n) => n.id)
      : effectiveBatchIndex != null &&
          effectiveBatchIndex < batches.length &&
          batches[effectiveBatchIndex]
        ? batches[effectiveBatchIndex].nodeIds
        : []
  );

  const graphData = useMemo(
    () => toForceGraphData(graph),
    [graph?.nodes, graph?.edges]
  );
  const isEmpty = graphData.nodes.length === 0;

  useEffect(() => {
    const el = graphAreaRef.current ?? containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isEmpty || !fgRef.current) return;
    const linkForce = fgRef.current.d3Force("link");
    const chargeForce = fgRef.current.d3Force("charge");
    if (linkForce) linkForce.distance(150);
    if (chargeForce) chargeForce.strength(-400);
    fgRef.current.d3ReheatSimulation();
  }, [graph?.nodes?.length, isEmpty]);

  // Update tooltip position when hovered node changes or graph transforms (pan/zoom)
  useEffect(() => {
    if (!hoveredNode || !fgRef.current) {
      setTooltipPos(null);
      return;
    }
    let rafId: number;
    const updatePos = () => {
      if (!fgRef.current || !hoveredNode) return;
      const bckgDimensions = (hoveredNode as { __bckgDimensions?: [number, number] }).__bckgDimensions ?? [50, 24];
      const leftX = (hoveredNode.x ?? 0) - bckgDimensions[0] / 2;
      const y = hoveredNode.y ?? 0;
      const { x: sx, y: sy } = fgRef.current.graph2ScreenCoords(leftX, y);
      setTooltipPos({ x: sx, y: sy });
    };
    updatePos();
    const loop = () => {
      updatePos();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [hoveredNode]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    if (!node) setTooltipPos(null);
  }, []);

  const handleNodeCanvasObject = useCallback(
    (node: { id?: string; name?: string; description?: string; x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = (node.name ?? node.id ?? "") as string;
      if (!label) return;
      const isHighlighted =
        batches.length === 0 || highlightedNodeIds.has((node.id as string) ?? "");
      const fontSize = Math.max(8, 11 / globalScale);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const pad = fontSize * 0.5;
      const bckgDimensions = [textWidth + pad * 2, fontSize + pad] as [number, number];
      (node as { __bckgDimensions?: [number, number] }).__bckgDimensions = bckgDimensions;

      ctx.fillStyle = isHighlighted
        ? "rgba(255,255,255,0.98)"
        : "rgba(255,255,255,0.4)";
      ctx.strokeStyle = isHighlighted
        ? "rgba(139,92,246,0.9)"
        : "rgba(100,100,100,0.5)";
      ctx.lineWidth = Math.max(0.5, (isHighlighted ? 2 : 1) / globalScale);
      const [w, h] = bckgDimensions;
      ctx.beginPath();
      const x = (node.x ?? 0) - w / 2;
      const y = (node.y ?? 0) - h / 2;
      const r = 2;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHighlighted ? "rgba(20,20,20,1)" : "rgba(80,80,80,0.7)";
      ctx.fillText(label, node.x ?? 0, node.y ?? 0);
    },
    [batches.length, selectedBatchIndex]
  );

  const handleNodePointerAreaPaint = useCallback(
    (node: { __bckgDimensions?: [number, number]; x?: number; y?: number }, color: string, ctx: CanvasRenderingContext2D) => {
      const bckgDimensions = (node as { __bckgDimensions?: [number, number] }).__bckgDimensions ?? [50, 24];
      ctx.fillStyle = color;
      ctx.fillRect(
        (node.x ?? 0) - bckgDimensions[0] / 2,
        (node.y ?? 0) - bckgDimensions[1] / 2,
        ...bckgDimensions
      );
    },
    []
  );

  const hasBatches = batches.length > 0;
  const maxIndex = batches.length; // batches.length = "All" view
  const canGoPrev = effectiveBatchIndex != null && effectiveBatchIndex > 0;
  const canGoNext =
    effectiveBatchIndex != null && effectiveBatchIndex < maxIndex;

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
    >
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
          Type a message to build your concept graph
        </div>
      ) : (
        <>
          <div ref={graphAreaRef} className="flex-1 min-h-0 min-w-0 relative overflow-visible">
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeId="id"
              nodeLabel={() => null}
              onNodeHover={handleNodeHover}
              nodeCanvasObject={handleNodeCanvasObject}
              nodeCanvasObjectMode={() => "replace"}
              nodePointerAreaPaint={handleNodePointerAreaPaint}
              linkColor={() => "rgba(150,150,150,0.5)"}
              linkWidth={1}
              d3VelocityDecay={0.6}
              d3AlphaDecay={0.03}
              onEngineStop={() => fgRef.current?.zoomToFit(200)}
              backgroundColor="rgba(255,255,255,0.85)"
            />
            {hoveredNode &&
              tooltipPos &&
              graphAreaRef.current &&
              (hoveredNode.description ?? hoveredNode.name) &&
              createPortal(
                <div
                  className="fixed z-9999 pointer-events-none max-w-[280px] rounded-lg border-2 border-zinc-500 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-lg px-3 py-2 text-xl text-zinc-800 dark:text-zinc-200"
                  style={{
                    left:
                      graphAreaRef.current.getBoundingClientRect().left +
                      tooltipPos.x +
                      4,
                    top:
                      graphAreaRef.current.getBoundingClientRect().top +
                      tooltipPos.y,
                    transform: "translateY(-50%)",
                  }}
                >
                  {hoveredNode.description ?? hoveredNode.name}
                </div>,
                document.body
              )}
          </div>
          {hasBatches && (
            <div className="relative z-10 flex items-center justify-center gap-3 py-2 px-3 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!canGoPrev) return;
                  setSelectedBatchIndex((i) => {
                    const idx = i ?? batches.length - 1;
                    return idx > 0 ? idx - 1 : idx;
                  });
                }}
                aria-disabled={!canGoPrev}
                tabIndex={canGoPrev ? 0 : -1}
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors select-none ${
                  canGoPrev
                    ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 cursor-pointer active:scale-95"
                    : "text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50"
                }`}
                aria-label="Previous batch"
              >
                ← Prev
              </button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums min-w-12 text-center">
                {effectiveBatchIndex != null
                  ? isViewingAll
                    ? "All"
                    : `${effectiveBatchIndex + 1} / ${batches.length}`
                  : "—"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!canGoNext) return;
                  setSelectedBatchIndex((i) => {
                    const idx = i ?? batches.length - 1;
                    return idx < maxIndex ? idx + 1 : idx;
                  });
                }}
                aria-disabled={!canGoNext}
                tabIndex={canGoNext ? 0 : -1}
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors select-none ${
                  canGoNext
                    ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 cursor-pointer active:scale-95"
                    : "text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50"
                }`}
                aria-label="Next batch"
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
