import type { Id } from "../../convex/_generated/dataModel";
import type {
  ProjectWithSessions,
  WorkspaceFile,
} from "@/components/session-sidebar/workspaceTypes";

export type FileInWorkspaceContext = {
  file: WorkspaceFile;
  projectName: string;
  projectId: Id<"projects"> | null;
};

export function listFilesInWorkspace(
  workspace: ProjectWithSessions[] | undefined,
): FileInWorkspaceContext[] {
  if (!workspace) return [];
  const rows: FileInWorkspaceContext[] = [];
  for (const g of workspace) {
    const projectName = g.project?.name ?? "Inbox";
    const projectId = g.project?._id ?? null;
    for (const file of g.files) {
      rows.push({ file, projectName, projectId });
    }
  }
  return rows.sort((a, b) => b.file.createdAt - a.file.createdAt);
}

export function flattenFilesSorted(
  workspace: ProjectWithSessions[],
): WorkspaceFile[] {
  return [...workspace.flatMap((g) => g.files)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function firstFileByRecency(
  workspace: ProjectWithSessions[],
): WorkspaceFile | null {
  const sorted = flattenFilesSorted(workspace);
  return sorted[0] ?? null;
}

type WorkspaceSnapshotForMachine = {
  inboxEmpty: boolean;
  hasProjects: boolean;
  firstFileId: Id<"files"> | null;
  firstSessionId: Id<"sessions"> | null;
  firstProjectId: Id<"projects"> | null;
};

export function buildWorkspaceSnapshot(
  workspace: ProjectWithSessions[] | undefined,
): WorkspaceSnapshotForMachine | null {
  if (workspace === undefined) return null;
  const hasProjects = workspace.some((g) => g.project != null);
  const inboxGroup = workspace.find((g) => g.project == null);
  const inboxEmpty = !inboxGroup || inboxGroup.files.length === 0;
  const first = firstFileByRecency(workspace);
  return {
    inboxEmpty,
    hasProjects,
    firstFileId: first?._id ?? null,
    firstSessionId: first?.sessionId ?? null,
    firstProjectId: first?.projectId ?? null,
  };
}

export function findFileInWorkspace(
  workspace: ProjectWithSessions[] | undefined,
  fileId: Id<"files"> | null,
): FileInWorkspaceContext | undefined {
  if (!workspace || !fileId) return undefined;
  for (const g of workspace) {
    const f = g.files.find((x) => x._id === fileId);
    if (f) {
      return {
        file: f,
        projectName: g.project?.name ?? "Inbox",
        projectId: g.project?._id ?? null,
      };
    }
  }
  return undefined;
}

export function findFileBySessionId(
  workspace: ProjectWithSessions[] | undefined,
  sessionId: Id<"sessions"> | null,
): FileInWorkspaceContext | undefined {
  if (!workspace || !sessionId) return undefined;
  for (const g of workspace) {
    const f = g.files.find((x) => x.sessionId === sessionId);
    if (f) {
      return {
        file: f,
        projectName: g.project?.name ?? "Inbox",
        projectId: g.project?._id ?? null,
      };
    }
  }
  return undefined;
}

/** @deprecated Use findFileInWorkspace */
export function findSessionInWorkspace(
  workspace: ProjectWithSessions[] | undefined,
  sessionId: Id<"sessions"> | null,
): FileInWorkspaceContext | undefined {
  return findFileBySessionId(workspace, sessionId);
}
