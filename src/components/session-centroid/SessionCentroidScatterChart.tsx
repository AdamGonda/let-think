import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import type { SessionCentroidProjectedPoint } from "@/lib/sessionCentroidProjection";

type SessionCentroidScatterChartProps = {
  points: SessionCentroidProjectedPoint[];
  isLoading?: boolean;
  error?: string | null;
  onSelectSession?: (sessionId: string) => void;
};

const FIXED_DOMAIN = { min: -1.1, max: 1.1 } as const;

export function SessionCentroidScatterChart({
  points,
  isLoading = false,
  error = null,
  onSelectSession,
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

  const series = [
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

  return (
    <div className="h-[320px] rounded-xl border border-border bg-background p-1">
      <ResponsiveScatterPlot
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
          <div className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium shadow-sm whitespace-nowrap">
            {String(node.data.sessionTitle)}
          </div>
        )}
        onClick={(node) => onSelectSession?.(String(node.data.sessionId))}
      />
    </div>
  );
}
