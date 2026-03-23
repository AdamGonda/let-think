import { useState, useEffect, useCallback } from "react";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

const PINNED_STORAGE_KEY = "think-pinned-project-ids";

function loadPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>) {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function usePinnedProjectIds(
  workspace: ProjectWithSessions[] | undefined,
) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);

  useEffect(() => {
    if (!workspace) return;
    const valid = new Set(
      workspace.flatMap((g) => (g.project ? [g.project._id as string] : [])),
    );
    // Prune deleted project IDs from persisted pin set when workspace updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync storage-backed Set with server workspace
    setPinnedIds((prev) => {
      let pruned = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else pruned = true;
      }
      if (!pruned && next.size === prev.size) return prev;
      savePinnedIds(next);
      return next;
    });
  }, [workspace]);

  const toggleProjectPinned = useCallback((projectId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      savePinnedIds(next);
      return next;
    });
  }, []);

  return { pinnedIds, toggleProjectPinned };
}
