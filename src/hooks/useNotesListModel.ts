import { useState, useMemo, useEffect } from "react";
import type {
  ProjectRow,
  ProjectWithSessions,
  SessionWithPublish,
} from "@/components/session-sidebar/workspaceTypes";
import type { NotesListPublishFilter } from "@/machines/appUiTypes";
import {
  type NotesListDrill,
  type SortMode,
  groupDisplayName,
  projectGroupMatchesQuery,
  resolveDrillGroup,
  groupActivityMs,
} from "@/lib/notesListUtils";

function filterSessionsByPublish(
  sessions: SessionWithPublish[],
  filter: NotesListPublishFilter,
): SessionWithPublish[] {
  if (filter === "all") return sessions;
  if (filter === "published") return sessions.filter((s) => s.isPublished);
  return sessions.filter((s) => !s.isPublished);
}

export function useNotesListModel(
  workspace: ProjectWithSessions[] | undefined,
  drill: NotesListDrill,
  onDrillChange: (drill: NotesListDrill) => void,
  publishFilter: NotesListPublishFilter,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("activity");

  const totalSessions =
    workspace?.reduce((n, g) => n + g.sessions.length, 0) ?? 0;

  /** Inbox + projects, sorted (matches Files grid: one card per folder). */
  const sortedGroups = useMemo(() => {
    if (!workspace) return [];
    const inboxGroup = workspace.find((g) => g.project == null);
    const projectGroups = workspace.filter(
      (g): g is ProjectRow => g.project != null,
    );
    const combined: ProjectWithSessions[] = [];
    if (inboxGroup) combined.push(inboxGroup);
    combined.push(...projectGroups);

    if (sortMode === "name") {
      combined.sort((a, b) =>
        groupDisplayName(a).localeCompare(groupDisplayName(b), undefined, {
          sensitivity: "base",
        }),
      );
      return combined;
    }

    combined.sort((a, b) => {
      const createdA = a.project?.createdAt ?? 0;
      const createdB = b.project?.createdAt ?? 0;
      const ta = groupActivityMs(a.sessions, createdA);
      const tb = groupActivityMs(b.sessions, createdB);
      return tb - ta;
    });
    return combined;
  }, [workspace, sortMode]);

  const groupsAfterPublish = useMemo(() => {
    return sortedGroups
      .map((g) => ({
        ...g,
        sessions: filterSessionsByPublish(g.sessions, publishFilter),
      }))
      .filter((g) =>
        publishFilter === "all" ? true : g.sessions.length > 0,
      );
  }, [sortedGroups, publishFilter]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupsAfterPublish;
    return groupsAfterPublish.filter((g) => projectGroupMatchesQuery(g, q));
  }, [groupsAfterPublish, searchQuery]);

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
    let sessions = filterSessionsByPublish([...drillGroup.sessions], publishFilter);
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
  }, [drillGroup, searchQuery, sortMode, publishFilter]);

  return {
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    totalSessions,
    sortedGroups,
    filteredGroups,
    drillGroup,
    filteredDrillSessions,
  };
}
