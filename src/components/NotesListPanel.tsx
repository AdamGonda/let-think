import { useState, useMemo, useEffect, useCallback } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import type { ProjectWithSessions } from "./SessionSidebar";

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

type SortMode = "activity" | "name";

export type NotesListDrill =
  | null
  | { type: "inbox" }
  | { type: "project"; id: Id<"projects"> };

function formatUpdatedLabel(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(diff / 86400_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  if (hours < 24) return `Updated ${hours}h ago`;
  if (days < 7) return `Updated ${days}d ago`;
  return `Updated ${new Date(ms).toLocaleDateString()}`;
}

function groupActivityMs(sessions: Doc<"sessions">[], projectCreated: number): number {
  if (sessions.length === 0) return projectCreated;
  return Math.max(...sessions.map((s) => s.createdAt));
}

function groupDisplayName(group: ProjectWithSessions): string {
  return group.project?.name ?? "Inbox";
}

function projectGroupMatchesQuery(group: ProjectWithSessions, q: string): boolean {
  return groupDisplayName(group).toLowerCase().includes(q);
}

function resolveDrillGroup(
  workspace: ProjectWithSessions[],
  drill: NotesListDrill,
): ProjectWithSessions | undefined {
  if (!drill) return undefined;
  if (drill.type === "inbox") {
    return workspace.find((g) => g.project == null);
  }
  return workspace.find((g) => g.project?._id === drill.id);
}

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
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);

  const totalSessions =
    workspace?.reduce((n, g) => n + g.sessions.length, 0) ?? 0;

  useEffect(() => {
    if (!workspace) return;
    const valid = new Set(
      workspace.flatMap((g) => (g.project ? [g.project._id as string] : [])),
    );
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
    drilled && drillGroup ? `${drillTitle} sessions` : "Projects";

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6">
        <div className="shrink-0 border-b border-border py-6">
          <div
            className={`mb-5 flex min-h-10 items-center ${
              drilled && drillGroup ? "gap-6" : ""
            }`}
          >
            {drilled && drillGroup ? (
              <button
                type="button"
                onClick={() => {
                  onDrillChange(null);
                  setSearchQuery("");
                }}
                className="shrink-0 cursor-pointer rounded-lg border border-border/80 bg-card p-2 text-foreground transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Back to projects"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : null}
            <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground truncate">
              {drillHeading}
            </h1>
          </div>
          <div className="relative mb-3 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={
                drilled ? "Search sessions…" : "Search projects…"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full pl-9 rounded-lg bg-muted/25 border-border/80 focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex justify-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
              <span className="sr-only">Sort</span>
              <span className="hidden sm:inline">Sort by</span>
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) =>
                    setSortMode(e.target.value as SortMode)
                  }
                  className="appearance-none cursor-pointer rounded-lg border border-border/80 bg-card py-1.5 pl-3 pr-8 text-sm text-foreground transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="activity">Last changed</option>
                  <option value="name">Name</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </label>
          </div>
        </div>

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
                    const title = groupDisplayName(group);
                    const sessions = group.sessions;
                    const count = sessions.length;
                    const sessionCountLabel =
                      count === 0
                        ? "No sessions yet"
                        : count === 1
                          ? "1 session"
                          : `${count} sessions`;
                    const activity = groupActivityMs(
                      sessions,
                      group.project?.createdAt ?? 0,
                    );
                    const key = group.project?._id ?? "__inbox__";
                    const emptyInbox = group.project == null && count === 0;
                    const projectId = group.project?._id;
                    const isPinned = projectId
                      ? pinnedIds.has(projectId as string)
                      : false;
                    const pinLabelId = projectId
                      ? `pin-label-${projectId}`
                      : undefined;
                    return (
                      <li key={key}>
                        <div
                          className={`relative rounded-xl ${
                            group.project == null
                              ? "border-4 border-border"
                              : "border-2 border-border/90"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onDrillChange(
                                group.project
                                  ? { type: "project", id: group.project._id }
                                  : { type: "inbox" },
                              )
                            }
                            className="flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 pr-12 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-foreground leading-snug line-clamp-2">
                                {title}
                              </span>
                              {group.project == null && (
                                <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Inbox
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                              {sessionCountLabel}
                            </p>
                            <p className="text-xs text-muted-foreground/90 pt-1">
                              {emptyInbox
                                ? "—"
                                : formatUpdatedLabel(activity)}
                            </p>
                          </button>
                          {projectId ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className="absolute right-2 top-2 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`${title} options`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="min-w-[220px]"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem
                                  closeOnClick={false}
                                  className="flex cursor-default items-center justify-between gap-4 py-2.5"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <span
                                    id={pinLabelId}
                                    className="text-sm text-foreground"
                                  >
                                    Pin to top
                                  </span>
                                  <Switch
                                    checked={isPinned}
                                    onCheckedChange={() =>
                                      toggleProjectPinned(projectId as string)
                                    }
                                    aria-labelledby={pinLabelId}
                                  />
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
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
                              : "border-2 border-border/90"
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
