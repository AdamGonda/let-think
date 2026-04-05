import { useState, useMemo, useEffect } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { FileText } from "lucide-react";
import type { ProjectWithSessions } from "./session-sidebar/workspaceTypes";
import { usePinnedProjectIds } from "@/hooks/usePinnedProjectIds";
import {
  type NotesListDrill,
  type SortMode,
  groupDisplayName,
  projectGroupMatchesQuery,
  resolveDrillGroup,
  formatUpdatedLabel,
  groupActivityMs,
} from "@/lib/notesListUtils";
import { NotesListToolbar } from "./notes-list/NotesListToolbar";
import { ProjectSummaryCard } from "./notes-list/ProjectSummaryCard";

export type { NotesListDrill };

interface NotesListPanelProps {
  workspace: ProjectWithSessions[] | undefined;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  onSelectSession: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({
  workspace,
  drill,
  onDrillChange,
  onSelectSession,
}: NotesListPanelProps) {
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
      const inboxGroup = copy.find((g) => g.project == null);
      const projectGroups = copy.filter((g) => g.project != null);
      projectGroups.sort((a, b) => {
        const order = sortProjects(a, b);
        if (order !== 0) return order;
        return groupDisplayName(a).localeCompare(groupDisplayName(b), undefined, {
          sensitivity: "base",
        });
      });
      return inboxGroup ? [inboxGroup, ...projectGroups] : projectGroups;
    }
    const inboxGroup = copy.find((g) => g.project == null);
    const projectGroups = copy.filter((g) => g.project != null);
    projectGroups.sort((a, b) => {
      const order = sortProjects(a, b);
      if (order !== 0) return order;
      const ta = groupActivityMs(a.sessions, a.project!.createdAt);
      const tb = groupActivityMs(b.sessions, b.project!.createdAt);
      return tb - ta;
    });
    return inboxGroup ? [inboxGroup, ...projectGroups] : projectGroups;
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

  if (!workspace) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-base py-6 px-6">
        Loading…
      </div>
    );
  }

  if (totalSessions === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-base py-12 px-6 text-center gap-3">
        <div className="rounded-full bg-muted/50 p-4">
          <FileText className="size-8 text-muted-foreground/60" />
        </div>
        <p className="font-medium text-foreground">No notes yet</p>
        <p className="text-sm max-w-[280px]">
          Create a session in the sidebar to start collecting thinking notes under
          a project or in your inbox
        </p>
      </div>
    );
  }

  const drilled = drill != null;
  const drillTitle = drillGroup ? groupDisplayName(drillGroup) : "";
  const drillHeading =
    drilled && drillGroup ? `${drillTitle}` : "Projects";

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6">
        <NotesListToolbar
          drilled={drilled}
          hasDrillGroup={!!drillGroup}
          drillHeading={drillHeading}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onBackFromDrill={() => {
            onDrillChange(null);
            setSearchQuery("");
          }}
        />

        <div className="min-h-0 flex-1 overflow-y-auto py-6">
          {!drilled && (
            <>
              {filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Nothing matches &quot;{searchQuery}&quot;
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredGroups.map((group) => {
                    const key = group.project?._id ?? "__inbox__";
                    const projectId = group.project?._id;
                    const isPinned = projectId
                      ? pinnedIds.has(projectId as string)
                      : false;
                    const pinLabelId = projectId
                      ? `pin-label-${projectId}`
                      : undefined;
                    return (
                      <li key={key}>
                        <ProjectSummaryCard
                          group={group}
                          isPinned={isPinned}
                          pinLabelId={pinLabelId}
                          onDrill={() =>
                            onDrillChange(
                              group.project
                                ? { type: "project", id: group.project._id }
                                : { type: "inbox" },
                            )
                          }
                          onTogglePin={() => {
                            if (projectId) toggleProjectPinned(projectId as string);
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {drilled && drillGroup && (
            <>
              {filteredDrillSessions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {drillGroup.sessions.length === 0
                      ? drill?.type === "inbox"
                        ? "No notes in your inbox yet."
                        : "No notes in this project yet."
                      : `Nothing matches "${searchQuery}"`}
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredDrillSessions.map((session) => (
                    <li key={session._id}>
                      <button
                        type="button"
                        onClick={() => onSelectSession(session)}
                        className={`flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-xl bg-card p-5 text-left shadow-sm transition-colors hover:border-border hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          drill?.type === "inbox"
                            ? "border-4 border-border"
                            : "border-4 border-border border-dashed"
                        }`}
                      >
                        <span className="font-semibold text-foreground leading-snug line-clamp-2">
                          {session.title}
                        </span>
                        <p className="text-xs text-muted-foreground/90 pt-1">
                          {formatUpdatedLabel(session.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
