import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppUiActor, useAppUiSelector } from "./useAppUi";
import type { ProjectWithSessions } from "../components/SessionSidebar";

/**
 * Default session when workspace loads, empty-inbox UX, and first-message session creation.
 */
export function useDefaultSessionSelection(
  projectsWithSessions: ProjectWithSessions[] | undefined,
) {
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const actor = useAppUiActor();
  const createSessionMutation = useMutation(api.sessions.create);
  const hasEverHadSelectionRef = useRef(false);

  const allSessionsSorted = useMemo(() => {
    if (!projectsWithSessions) return undefined;
    return projectsWithSessions
      .flatMap((g) => g.sessions)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [projectsWithSessions]);

  useEffect(() => {
    if (activeSessionId) hasEverHadSelectionRef.current = true;
  }, [activeSessionId]);

  useEffect(() => {
    if (
      allSessionsSorted &&
      allSessionsSorted.length > 0 &&
      !activeSessionId &&
      !hasEverHadSelectionRef.current
    ) {
      const first = allSessionsSorted[0]!;
      actor.send({ type: "ACTIVE_SESSION_SET", sessionId: first._id });
      if (first.projectId) {
        actor.send({ type: "ACTIVE_PROJECT_SET", projectId: first.projectId });
      }
      hasEverHadSelectionRef.current = true;
    }
  }, [allSessionsSorted, activeSessionId, actor]);

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const id = await createSessionMutation({});
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: id });
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
    hasEverHadSelectionRef.current = true;
    return id;
  }, [createSessionMutation, actor]);

  useEffect(() => {
    if (!projectsWithSessions) return;
    const hasProjects = projectsWithSessions.some((g) => g.project != null);
    const inboxGroup = projectsWithSessions.find((g) => g.project == null);
    const inboxEmpty = !inboxGroup || inboxGroup.sessions.length === 0;
    if (!hasProjects && inboxEmpty) {
      actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
      actor.send({ type: "ACTIVE_SESSION_SET", sessionId: null });
    }
  }, [projectsWithSessions, actor]);

  return { handleCreateSessionForFirstMessage };
}
