import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

export type NotesListDrill =
  | null
  | { type: "inbox" }
  | { type: "project"; id: Id<"projects"> };

export function formatUpdatedLabel(ms: number): string {
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

export function groupActivityMs(
  sessions: Doc<"sessions">[],
  projectCreated: number,
): number {
  if (sessions.length === 0) return projectCreated;
  return Math.max(...sessions.map((s) => s.createdAt));
}

export function groupDisplayName(group: ProjectWithSessions): string {
  return group.project?.name ?? "Inbox";
}

export function projectGroupMatchesQuery(
  group: ProjectWithSessions,
  q: string,
): boolean {
  return groupDisplayName(group).toLowerCase().includes(q);
}

export function resolveDrillGroup(
  workspace: ProjectWithSessions[],
  drill: NotesListDrill,
): ProjectWithSessions | undefined {
  if (!drill) return undefined;
  if (drill.type === "inbox") {
    return workspace.find((g) => g.project == null);
  }
  return workspace.find((g) => g.project?._id === drill.id);
}
