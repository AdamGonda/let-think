import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  projectSessionCentroidsTo2D,
  type SessionCentroidProjectedPoint,
} from "@/lib/sessionCentroidProjection";

type VectorRow = {
  sessionId: Id<"sessions">;
  sessionTitle: string;
  projectId?: Id<"projects">;
  projectName: string | null;
  vector: number[];
  sourceNodeCount: number;
  syncStatus: "success";
  updatedAt: number;
  lastSyncedAt?: number;
};

type FetchedCentroids = {
  key: string;
  rows: VectorRow[];
  error: string | null;
};

type UseSessionCentroidMapDataArgs = {
  projectId?: Id<"projects">;
  sessionIds?: Id<"sessions">[];
};

export function useSessionCentroidMapData({
  projectId,
  sessionIds,
}: UseSessionCentroidMapDataArgs) {
  const refs = useQuery(api.conceptEmbeddings.listSessionCentroidRefs, {
    projectId,
    sessionIds,
  });
  const fetchVectors = useAction(
    api.conceptEmbeddingsActions.fetchSessionCentroidVectors
  );

  const refsKey = useMemo(() => {
    if (!refs) return "loading";
    return refs
      .map((row) => `${row.sessionId}:${row.weaviateObjectId}:${row.updatedAt}`)
      .join("|");
  }, [refs]);

  const [fetched, setFetched] = useState<FetchedCentroids | null>(null);

  useEffect(() => {
    if (!refs || refs.length === 0) return;
    let cancelled = false;
    void fetchVectors({ refs })
      .then((rows) => {
        if (cancelled) return;
        setFetched({ key: refsKey, rows, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFetched({
          key: refsKey,
          rows: [],
          error: err instanceof Error ? err.message : "Failed to load centroids",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchVectors, refsKey, refs]);

  const current = fetched?.key === refsKey ? fetched : null;

  const points: SessionCentroidProjectedPoint[] = useMemo(() => {
    return projectSessionCentroidsTo2D(
      (current?.rows ?? []).map((row) => ({
        sessionId: row.sessionId,
        sessionTitle: row.sessionTitle,
        projectName: row.projectName,
        vector: row.vector,
        sourceNodeCount: row.sourceNodeCount,
      }))
    );
  }, [current]);

  return {
    points,
    isLoading: refs === undefined || (refs.length > 0 && current === null),
    error: current?.error ?? null,
  };
}
