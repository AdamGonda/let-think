import type { Doc } from "../../../convex/_generated/dataModel";

/** Session row from `listWithSessions` — includes publish flag for Files filters. */
export type SessionWithPublish = Doc<"sessions"> & { isPublished: boolean };

export type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  sessions: SessionWithPublish[];
};

/** Workspace slice where `project` is set (excludes the synthetic inbox group). */
export type ProjectRow = ProjectWithSessions & {
  project: Doc<"projects">;
};

export type SessionSidebarHandle = {
  expand: () => void;
  collapse: () => void;
};
