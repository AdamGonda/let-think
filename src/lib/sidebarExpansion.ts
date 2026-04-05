import type { Dispatch, SetStateAction } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

/**
 * Expand the project row that contains the active session (sidebar follow).
 * Optionally run when the containing project is found (e.g. open Projects accordion).
 */
export function expandProjectRowForActiveSession(
  workspace: ProjectWithSessions[] | undefined,
  activeSessionId: Id<"sessions"> | null,
  setExpandedProjectIds: Dispatch<SetStateAction<Set<string>>>,
  onFoundContainingProject?: (projectId: Id<"projects">) => void,
): void {
  if (!workspace || !activeSessionId) return;
  for (const { project, sessions } of workspace) {
    const hasActive = sessions.some((s: Doc<"sessions">) => s._id === activeSessionId);
    if (hasActive && project) {
      setExpandedProjectIds((prev) =>
        prev.has(project._id) ? prev : new Set([...prev, project._id]),
      );
      onFoundContainingProject?.(project._id);
      break;
    }
  }
}
