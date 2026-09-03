import type { Doc, Id } from "../../../convex/_generated/dataModel";

/** Lean file row from `projects.listWithSessions` (no thinkingNotes). */
export type WorkspaceFile = {
  _id: Id<"files">;
  _creationTime: number;
  title: string;
  createdAt: number;
  projectId?: Id<"projects">;
  sessionId: Id<"sessions"> | null;
};

export type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  files: WorkspaceFile[];
};

/** Workspace slice where `project` is set (excludes the synthetic inbox group). */
export type ProjectRow = ProjectWithSessions & {
  project: Doc<"projects">;
};
