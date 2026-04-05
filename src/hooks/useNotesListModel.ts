import { useState, useMemo, useEffect } from "react";
import type {
  ProjectRow,
  ProjectWithSessions,
} from "@/components/session-sidebar/workspaceTypes";
import { usePinnedProjectIds } from "@/hooks/usePinnedProjectIds";
import {
  type NotesListDrill,
  type SortMode,
  groupDisplayName,
  projectGroupMatchesQuery,
  resolveDrillGroup,
  groupActivityMs,
} from "@/lib/notesListUtils";

export function useNotesListModel(
  workspace: ProjectWithSessions[] | undefined,
  drill: NotesListDrill,
  onDrillChange: (drill: NotesListDrill) => void,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("activity");
  const { pinnedIds, toggleProjectPinned } = usePinnedProjectIds(workspace);

  const totalSessions =
    workspace?.reduce((n, g) => n + g.sessions.length, 0) ?? 0;

  const sortedGroups = useMemo(() => {
    if (!workspace) return [];
    const copy = [...workspace];
    const sortProjects = (a: ProjectWithSessions, b: ProjectWithSessions) => {
      const pidA = a.project!._id as string;
      const pidB = b.project!._id as string;
      const pinA = pinnedIds.has(pidA);
      const pinB = pinnedIds.has(pidB);
      if (pinA !== pinB) return pinA ? -1 : 1;
      return 0;
    };
    if (sortMode === "name") {
      const projectGroups = copy.filter(
        (g): g is ProjectRow => g.project != null,
      );
      projectGroups.sort((a, b) => {
        const order = sortProjects(a, b);
        if (order !== 0) return order;
        return groupDisplayName(a).localeCompare(groupDisplayName(b), undefined, {
          sensitivity: "base",
        });
      });
      return projectGroups;
    }
    const projectGroups = copy.filter(
      (g): g is ProjectRow => g.project != null,
    );
    projectGroups.sort((a, b) => {
      const order = sortProjects(a, b);
      if (order !== 0) return order;
      const ta = groupActivityMs(a.sessions, a.project.createdAt);
      const tb = groupActivityMs(b.sessions, b.project.createdAt);
      return tb - ta;
    });
    return projectGroups;
  }, [workspace, sortMode, pinnedIds]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedGroups;
    return sortedGroups.filter((g) => projectGroupMatchesQuery(g, q));
  }, [sortedGroups, searchQuery]);

  const drillGroup = useMemo(
    () => (workspace && drill ? resolveDrillGroup(workspace, drill) : undefined),
    [workspace, drill],
  );

  useEffect(() => {
    if (drill && workspace && !drillGroup) {
      onDrillChange(null);
    }
  }, [drill, workspace, drillGroup, onDrillChange]);

  const filteredDrillSessions = useMemo(() => {
    if (!drillGroup) return [];
    const q = searchQuery.trim().toLowerCase();
    let sessions = [...drillGroup.sessions];
    if (q) {
      sessions = sessions.filter((s) =>
        s.title.toLowerCase().includes(q),
      );
    }
    if (sortMode === "name") {
      sessions.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    } else {
      sessions.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sessions;
  }, [drillGroup, searchQuery, sortMode]);

  return {
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    pinnedIds,
    toggleProjectPinned,
    totalSessions,
    sortedGroups,
    filteredGroups,
    drillGroup,
    filteredDrillSessions,
  };
}
