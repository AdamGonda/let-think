import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { timings } from "@/config";
import {
  WORKSPACE_SEARCH_MIN_QUERY_LENGTH,
  type WorkspaceSearchHit,
} from "@/lib/searchHits";

export type WorkspaceSearchStatus =
  | "idle"
  | "loading"
  | "ready"
  | "indexing"
  | "error";

/** Cached hits are only shown when they belong to the current query. */
export function workspaceSearchView(
  trimmed: string,
  minLength: number,
  cachedQuery: string | null,
): "idle" | "loading" | "cached" {
  if (trimmed.length < minLength) return "idle";
  if (cachedQuery !== trimmed) return "loading";
  return "cached";
}

type CachedSearch = {
  query: string;
  hits: WorkspaceSearchHit[];
  status: Exclude<WorkspaceSearchStatus, "idle" | "loading">;
  errorMessage: string | null;
};

export function useWorkspaceSearch(query: string) {
  const search = useAction(api.searchDocumentsActions.search);
  const trimmed = query.trim();
  const tooShort = trimmed.length < WORKSPACE_SEARCH_MIN_QUERY_LENGTH;
  const [cached, setCached] = useState<CachedSearch | null>(null);

  useEffect(() => {
    if (tooShort) {
      // Drop last results so re-typing the same term does not flash old cards.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset cache when the query goes idle
      setCached(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void search({ query: trimmed })
        .then((result) => {
          if (cancelled) return;
          setCached({
            query: trimmed,
            hits: result.hits,
            status: result.indexing ? "indexing" : "ready",
            errorMessage: null,
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setCached({
            query: trimmed,
            hits: [],
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Search failed",
          });
        });
    }, timings.workspaceSearchDebounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, tooShort, search]);

  const view = workspaceSearchView(
    trimmed,
    WORKSPACE_SEARCH_MIN_QUERY_LENGTH,
    cached?.query ?? null,
  );

  if (view === "idle") {
    return {
      hits: [] as WorkspaceSearchHit[],
      status: "idle" as const,
      errorMessage: null,
    };
  }
  if (view === "loading" || !cached) {
    return {
      hits: [] as WorkspaceSearchHit[],
      status: "loading" as const,
      errorMessage: null,
    };
  }
  return {
    hits: cached.hits,
    status: cached.status,
    errorMessage: cached.errorMessage,
  };
}
