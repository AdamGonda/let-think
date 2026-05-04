import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  projectSessionCentroidsTo2D,
  type SessionCentroidProjectedPoint,
} from "@/lib/sessionCentroidProjection";

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
  const [vectorRows, setVectorRows] = useState<
    Array<{
      sessionId: Id<"sessions">;
      sessionTitle: string;
      projectId?: Id<"projects">;
      projectName: string | null;
      vector: number[];
      sourceNodeCount: number;
      syncStatus: "success";
      updatedAt: number;
      lastSyncedAt?: number;
    }>
  >([]);
  const [isLoadingVectors, setIsLoadingVectors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refsKey = useMemo(() => {
    if (!refs) return "loading";
    return refs
      .map((row) => `${row.sessionId}:${row.weaviateObjectId}:${row.updatedAt}`)
      .join("|");
  }, [refs]);

  useEffect(() => {
    let cancelled = false;
    if (!refs) {
      setVectorRows([]);
      setIsLoadingVectors(true);
      setError(null);
      return () => {
        cancelled = true;
      };
    }
    if (refs.length === 0) {
      setVectorRows([]);
      setIsLoadingVectors(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }
    setIsLoadingVectors(true);
    setError(null);
    void fetchVectors({ refs })
      .then((rows) => {
        if (cancelled) return;
        setVectorRows(rows);
        setIsLoadingVectors(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setVectorRows([]);
        setIsLoadingVectors(false);
        setError(err instanceof Error ? err.message : "Failed to load centroids");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchVectors, refsKey, refs]);

  const points: SessionCentroidProjectedPoint[] = useMemo(() => {
    return projectSessionCentroidsTo2D(
      vectorRows.map((row) => ({
        sessionId: row.sessionId,
        sessionTitle: row.sessionTitle,
        projectName: row.projectName,
        vector: row.vector,
        sourceNodeCount: row.sourceNodeCount,
      }))
    );
  }, [vectorRows]);

  return {
    points,
    isLoading: refs === undefined || isLoadingVectors,
    error,
  };
}
