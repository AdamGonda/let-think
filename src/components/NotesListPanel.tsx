import { useState, useMemo, useEffect } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import type { ProjectWithSessions } from "./SessionSidebar";

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

function noteSnippet(raw: string | undefined, maxLen = 90): string | undefined {
  if (!raw?.trim()) return undefined;
  const line = raw.trim().split(/\n/)[0] ?? "";
  const plain = line.replace(/[#*_`[\]]/g, "").trim();
  if (!plain) return undefined;
  return plain.length > maxLen ? `${plain.slice(0, maxLen - 1)}…` : plain;
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
  onJumpToSession?: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({
  workspace,
  drill,
  onDrillChange,
  onSelectSession,
  onJumpToSession,
}: NotesListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("activity");

  const totalSessions =
    workspace?.reduce((n, g) => n + g.sessions.length, 0) ?? 0;

  const sortedGroups = useMemo(() => {
    if (!workspace) return [];
    const copy = [...workspace];
    if (sortMode === "name") {
      copy.sort((a, b) => {
        const aInbox = a.project == null;
        const bInbox = b.project == null;
        if (aInbox && !bInbox) return -1;
        if (!aInbox && bInbox) return 1;
        return groupDisplayName(a).localeCompare(groupDisplayName(b), undefined, {
          sensitivity: "base",
        });
      });
      return copy;
    }
    const inboxGroup = copy.find((g) => g.project == null);
    const projectGroups = copy.filter((g) => g.project != null);
    projectGroups.sort((a, b) => {
      const ta = groupActivityMs(a.sessions, a.project!.createdAt);
      const tb = groupActivityMs(b.sessions, b.project!.createdAt);
      return tb - ta;
    });
    return inboxGroup ? [inboxGroup, ...projectGroups] : projectGroups;
  }, [workspace, sortMode]);

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
                className="shrink-0 cursor-pointer rounded-lg border border-border/80 bg-card p-2 text-foreground transition-colors hover:bg-muted hover:border-border active:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="appearance-none cursor-pointer rounded-lg border border-border/80 bg-card py-1.5 pl-3 pr-8 text-sm text-foreground transition-colors hover:bg-muted/50 hover:border-border active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() =>
                            onDrillChange(
                              group.project
                                ? { type: "project", id: group.project._id }
                                : { type: "inbox" },
                            )
                          }
                          className={`flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-xl bg-transparent p-5 text-left shadow-none transition-colors hover:border-border hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            group.project == null
                              ? "border-4 border-border"
                              : "border-2 border-border/90"
                          }`}
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
                  {filteredDrillSessions.map((session) => {
                    const snippet = noteSnippet(session.thinkingNotes);
                    return (
                      <li key={session._id}>
                        <div className="flex min-h-30 flex-col gap-2 rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-colors hover:border-border">
                          <button
                            type="button"
                            onClick={() => onSelectSession(session)}
                            className="-m-1 flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-lg p-1 text-left transition-colors hover:bg-muted/40 active:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="font-semibold text-foreground leading-snug line-clamp-2">
                              {session.title}
                            </span>
                            <p className="text-xs text-muted-foreground/90 pt-1">
                              {formatUpdatedLabel(session.createdAt)}
                            </p>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
