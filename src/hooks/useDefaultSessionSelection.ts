import { useEffect, useRef, useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { activeSessionIdAtom, activeProjectIdAtom } from "../atoms/appAtoms";
import { useAppUiActor } from "./useAppUi";
import type { ProjectWithSessions } from "../components/SessionSidebar";

/**
 * Default session when workspace loads, empty-inbox UX, first-message session creation,
 * and SESSION_SYNC to the UI actor.
 */
export function useDefaultSessionSelection(
  projectsWithSessions: ProjectWithSessions[] | undefined,
) {
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveProjectId] = useAtom(activeProjectIdAtom);
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
    actor.send({ type: "SESSION_SYNC", active: activeSessionId != null });
  }, [activeSessionId, actor]);

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
      setActiveSessionId(first._id);
      if (first.projectId) setActiveProjectId(first.projectId);
      hasEverHadSelectionRef.current = true;
    }
  }, [allSessionsSorted, activeSessionId, setActiveSessionId, setActiveProjectId]);

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const id = await createSessionMutation({});
    setActiveSessionId(id);
    setActiveProjectId(null);
    hasEverHadSelectionRef.current = true;
    return id;
  }, [createSessionMutation, setActiveSessionId, setActiveProjectId]);

  useEffect(() => {
    if (!projectsWithSessions) return;
    const hasProjects = projectsWithSessions.some((g) => g.project != null);
    const inboxGroup = projectsWithSessions.find((g) => g.project == null);
    const inboxEmpty = !inboxGroup || inboxGroup.sessions.length === 0;
    if (!hasProjects && inboxEmpty) {
      setActiveProjectId(null);
      setActiveSessionId(null);
    }
  }, [projectsWithSessions, setActiveProjectId, setActiveSessionId]);

  return { handleCreateSessionForFirstMessage };
}
