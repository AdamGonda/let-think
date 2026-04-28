import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

/** Session plus display context for the group it belongs to (Inbox vs project). */
type SessionInWorkspaceContext = {
  session: Doc<"sessions">;
  projectName: string;
  projectId: Id<"projects"> | null;
};

/**
 * All sessions in the workspace, newest first (same ordering as auto-select in the app UI bridge).
 */
export function flattenSessionsSorted(
  workspace: ProjectWithSessions[],
): Doc<"sessions">[] {
  return [...workspace.flatMap((g) => g.sessions)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

/**
 * Most recently created session across inbox and projects, or null if none.
 */
export function firstSessionByRecency(
  workspace: ProjectWithSessions[],
): Doc<"sessions"> | null {
  const sorted = flattenSessionsSorted(workspace);
  return sorted[0] ?? null;
}

type WorkspaceSnapshotForMachine = {
  inboxEmpty: boolean;
  hasProjects: boolean;
  firstSessionId: Id<"sessions"> | null;
  firstProjectId: Id<"projects"> | null;
};

/**
 * Snapshot fields sent as WORKSPACE_SNAPSHOT to the app UI machine (auto-select, empty workspace).
 */
export function buildWorkspaceSnapshot(
  workspace: ProjectWithSessions[] | undefined,
): WorkspaceSnapshotForMachine | null {
  if (workspace === undefined) return null;
  const hasProjects = workspace.some((g) => g.project != null);
  const inboxGroup = workspace.find((g) => g.project == null);
  const inboxEmpty = !inboxGroup || inboxGroup.sessions.length === 0;
  const first = firstSessionByRecency(workspace);
  return {
    inboxEmpty,
    hasProjects,
    firstSessionId: first?._id ?? null,
    firstProjectId: first?.projectId ?? null,
  };
}

/**
 * Find a session by id and return it with its project/inbox label.
 */
export function findSessionInWorkspace(
  workspace: ProjectWithSessions[] | undefined,
  sessionId: Id<"sessions"> | null,
): SessionInWorkspaceContext | undefined {
  if (!workspace || !sessionId) return undefined;
  for (const g of workspace) {
    const s = g.sessions.find((x) => x._id === sessionId);
    if (s) {
      return {
        session: s,
        projectName: g.project?.name ?? "Inbox",
        projectId: g.project?._id ?? null,
      };
    }
  }
  return undefined;
}
