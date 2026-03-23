import type { Doc } from "../../../convex/_generated/dataModel";

export type ProjectWithSessions = {
  project: Doc<"projects"> | null;
  sessions: Doc<"sessions">[];
};
