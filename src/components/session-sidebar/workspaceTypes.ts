import type { Doc, Id } from "../../../convex/_generated/dataModel";

/** File as listed in the workspace, with its ideation session id. */
export type WorkspaceFile = Doc<"files"> & {
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
