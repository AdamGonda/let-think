import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

export type NotesListDrill =
  | null
  | { type: "inbox" }
  | { type: "project"; id: Id<"projects"> };

export type SortMode = "activity" | "name";

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
