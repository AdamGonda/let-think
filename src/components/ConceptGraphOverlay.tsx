import { useCallback, useRef, useEffect, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-2d";

export type ConceptGraphData = {
  nodes: Array< { id: string; name: string } >;
  edges: Array< { source: string; target: string } >;
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
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const fgRef = useRef<ForceGraphMethods<NodeObject, { source: string; target: string }> | null>(null);

  const graphData = toForceGraphData(graph);
  const isEmpty = graphData.nodes.length === 0;

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

  useEffect(() => {
    if (isEmpty || !fgRef.current) return;
    const linkForce = fgRef.current.d3Force("link");
    const chargeForce = fgRef.current.d3Force("charge");
    if (linkForce) linkForce.distance(150);
    if (chargeForce) chargeForce.strength(-400);
    fgRef.current.d3ReheatSimulation();
  }, [graph?.nodes?.length, isEmpty]);

  const handleNodeCanvasObject = useCallback(
    (node: { id?: string; name?: string; x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = (node.name ?? node.id ?? "") as string;
      if (!label) return;
      const fontSize = Math.max(8, 11 / globalScale);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const pad = fontSize * 0.5;
      const bckgDimensions = [textWidth + pad * 2, fontSize + pad];

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(100,100,100,0.9)";
      ctx.lineWidth = Math.max(0.5, 1.5 / globalScale);
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
      ctx.fillStyle = "rgba(20,20,20,1)";
      ctx.fillText(label, node.x ?? 0, node.y ?? 0);
    },
    []
  );

  return (
    <div ref={containerRef} className={className ?? "flex flex-1 min-w-0 min-h-0"} style={{ width: "100%", height: "100%" }}>
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-zinc-600 dark:text-zinc-400 text-base py-6 px-6">
          Type a message to build your concept graph
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeLabel="name"
          nodeCanvasObject={handleNodeCanvasObject}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={() => "rgba(150,150,150,0.5)"}
          linkWidth={1}
          onEngineStop={() => fgRef.current?.zoomToFit(200)}
          backgroundColor="rgba(255,255,255,0.85)"
        />
      )}
    </div>
  );
}
