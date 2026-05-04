import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import type { ScatterPlotDatum } from "@nivo/scatterplot";
import type { SessionCentroidProjectedPoint } from "@/lib/sessionCentroidProjection";

type CentroidScatterDatum = ScatterPlotDatum & {
  sessionId: string;
  sessionTitle: string;
  projectName: string | null;
  sourceNodeCount: number;
};

type SessionCentroidScatterChartProps = {
  points: SessionCentroidProjectedPoint[];
  isLoading?: boolean;
  error?: string | null;
  /** Fired when the pointer hovers a dot (or leaves the chart wrapper). */
  onHoveredSessionIdChange?: (sessionId: string | null) => void;
};

const FIXED_DOMAIN = { min: -1.1, max: 1.1 } as const;

export function SessionCentroidScatterChart({
  points,
  isLoading = false,
  error = null,
  onHoveredSessionIdChange,
}: SessionCentroidScatterChartProps) {
  if (isLoading) {
    return (
      <div className="h-[320px] rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Loading session map...
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-[320px] rounded-xl border border-border bg-muted/30 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="h-[320px] rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        No synced session centroids yet.
      </div>
    );
  }

  const series: Array<{ id: string; data: CentroidScatterDatum[] }> = [
    {
      id: "sessions",
      data: points.map((point) => ({
        x: point.x,
        y: point.y,
        sessionId: point.sessionId,
        sessionTitle: point.sessionTitle,
        projectName: point.projectName,
        sourceNodeCount: point.sourceNodeCount,
      })),
    },
  ];

  const setHoverFromNode = (node: { data: CentroidScatterDatum }) => {
    onHoveredSessionIdChange?.(String(node.data.sessionId));
  };

  return (
    <div
      className="h-[320px] rounded-xl border border-border bg-background p-1"
      onMouseLeave={() => onHoveredSessionIdChange?.(null)}
    >
      <ResponsiveScatterPlot<CentroidScatterDatum>
        data={series}
        margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
        xScale={{ type: "linear", ...FIXED_DOMAIN }}
        yScale={{ type: "linear", ...FIXED_DOMAIN }}
        axisBottom={null}
        axisLeft={null}
        nodeSize={12}
        colors="var(--session-accent)"
        blendMode="normal"
        useMesh
        enableGridX={false}
        enableGridY={false}
        tooltip={({ node }) => (
          <div className="rounded-md border border-border bg-background px-3 py-2 text-base font-semibold leading-snug text-foreground shadow-sm whitespace-nowrap max-w-[min(100vw-2rem,20rem)] truncate">
            {String(node.data.sessionTitle)}
          </div>
        )}
        onMouseEnter={(node) => setHoverFromNode(node)}
        onMouseMove={(node) => setHoverFromNode(node)}
      />
    </div>
  );
}
