import { useState, useMemo, useEffect } from "react";
import type {
  ProjectRow,
  ProjectWithSessions,
} from "@/components/session-sidebar/workspaceTypes";
import {
  type NotesListDrill,
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

  const totalSessions =
    workspace?.reduce((n, g) => n + g.files.length, 0) ?? 0;

  /** Inbox first, then project folders by recent activity (Files grid: one card per folder). */
  const sortedGroups = useMemo(() => {
    if (!workspace) return [];
    const inboxGroup = workspace.find((g) => g.project == null);
    const projectGroups = workspace.filter(
      (g): g is ProjectRow => g.project != null,
    );
    projectGroups.sort((a, b) => {
      const createdA = a.project.createdAt;
      const createdB = b.project.createdAt;
      const ta = groupActivityMs(a.files, createdA);
      const tb = groupActivityMs(b.files, createdB);
      return tb - ta;
    });
    const out: ProjectWithSessions[] = [];
    if (inboxGroup) out.push(inboxGroup);
    out.push(...projectGroups);
    return out;
  }, [workspace]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? sortedGroups
      : sortedGroups.filter((g) => projectGroupMatchesQuery(g, q));
    const inbox = list.find((g) => g.project == null);
    const rest = list.filter((g) => g.project != null);
    return inbox ? [inbox, ...rest] : rest;
  }, [sortedGroups, searchQuery]);

  /**
   * Files grid: Inbox first when it has files, then project folders.
   * Unfiled sessions live inside Inbox, not as loose cards on the root.
   */
  const rootFolders = useMemo(
    () =>
      filteredGroups.filter(
        (g) => g.project != null || g.files.length > 0,
      ),
    [filteredGroups],
  );

  const hasProjects = (workspace?.some((g) => g.project != null) ?? false);
  const isEmpty = totalSessions === 0 && !hasProjects;

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
    let files = [...drillGroup.files];
    if (q) {
      files = files.filter((s) =>
        s.title.toLowerCase().includes(q),
      );
    }
    files.sort((a, b) => b.createdAt - a.createdAt);
    return files;
  }, [drillGroup, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    totalSessions,
    hasProjects,
    isEmpty,
    sortedGroups,
    filteredGroups,
    rootFolders,
    drillGroup,
    filteredDrillSessions,
  };
}
