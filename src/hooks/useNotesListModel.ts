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
    workspace?.reduce((n, g) => n + g.sessions.length, 0) ?? 0;

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
      const ta = groupActivityMs(a.sessions, createdA);
      const tb = groupActivityMs(b.sessions, createdB);
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

  /** Folders at the dashboard root (projects only — inbox files sit beside them). */
  const rootFolders = useMemo(
    () => filteredGroups.filter((g): g is ProjectRow => g.project != null),
    [filteredGroups],
  );

  const inboxGroup = useMemo(
    () => sortedGroups.find((g) => g.project == null),
    [sortedGroups],
  );

  const rootFiles = useMemo(() => {
    const sessions = inboxGroup?.sessions ?? [];
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? sessions
      : sessions.filter((s) => s.title.toLowerCase().includes(q));
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [inboxGroup, searchQuery]);

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
    let sessions = [...drillGroup.sessions];
    if (q) {
      sessions = sessions.filter((s) =>
        s.title.toLowerCase().includes(q),
      );
    }
    sessions.sort((a, b) => b.createdAt - a.createdAt);
    return sessions;
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
    rootFiles,
    drillGroup,
    filteredDrillSessions,
  };
}
