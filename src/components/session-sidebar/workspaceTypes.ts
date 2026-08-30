import type { Doc } from "../../../convex/_generated/dataModel";

export type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  sessions: Doc<"sessions">[];
};

/** Workspace slice where `project` is set (excludes the synthetic inbox group). */
export type ProjectRow = ProjectWithSessions & {
  project: Doc<"projects">;
};
