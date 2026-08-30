import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

type UseWorkspaceActionsArgs = {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
};

export function useWorkspaceActions({
  workspace,
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
}: UseWorkspaceActionsArgs) {
  const posthog = usePostHog();
  const createSession = useMutation(api.sessions.create);
  const createProject = useMutation(api.projects.create);
  const removeSession = useMutation(api.sessions.remove);
  const moveToProject = useMutation(api.sessions.moveToProject);
  const removeProject = useMutation(api.projects.remove);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateProjectName = useMutation(api.projects.updateName);

  const allSessions = useMemo(
    () => workspace?.flatMap((g: ProjectWithSessions) => g.sessions) ?? [],
    [workspace],
  );

  const handleNewSession = useCallback(
    async (projectId?: Id<"projects">) => {
      const id = await createSession({ projectId: projectId ?? undefined });
      posthog.capture("session_created", { has_project: !!projectId });
      onSelectSession(id);
      onSelectProject(projectId ?? null);
      window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
      return id;
    },
    [createSession, onSelectSession, onSelectProject, posthog],
  );

  const handleNewProject = useCallback(async () => {
    const id = await createProject();
    posthog.capture("project_created");
    return id;
  }, [createProject, posthog]);

  const handleRenameSession = useCallback(
    async (id: Id<"sessions">, title: string) => {
      if (title?.trim()) {
        await updateTitle({ id, title: title.trim() });
        posthog.capture("session_renamed");
      }
    },
    [updateTitle, posthog],
  );

  const handleRenameProject = useCallback(
    async (id: Id<"projects">, name: string) => {
      if (name?.trim()) {
        await updateProjectName({ id, name: name.trim() });
      }
    },
    [updateProjectName],
  );

  const handleDeleteSession = useCallback(
    async (id: Id<"sessions">) => {
      const wasActive = activeSessionId === id;
      await removeSession({ id });
      posthog.capture("session_deleted", { was_active: wasActive });
      if (wasActive) {
        onSelectSession(null);
      }
    },
    [activeSessionId, removeSession, onSelectSession, posthog],
  );

  const handleMoveSession = useCallback(
    async (
      sessionId: Id<"sessions">,
      targetProjectId: Id<"projects"> | null,
    ) => {
      const session = allSessions.find(
        (s: Doc<"sessions">) => s._id === sessionId,
      );
      if ((session?.projectId ?? null) === targetProjectId) return;
      await moveToProject({
        id: sessionId,
        projectId: targetProjectId ?? undefined,
      });
      posthog.capture("session_moved_to_project", {
        to_inbox: targetProjectId === null,
      });
      if (activeSessionId === sessionId) {
        onSelectProject(targetProjectId);
      }
    },
    [allSessions, moveToProject, activeSessionId, onSelectProject, posthog],
  );

  const handleDeleteProject = useCallback(
    async (id: Id<"projects">) => {
      const wasActiveProject = activeProjectId === id;
      await removeProject({ id });
      posthog.capture("project_deleted", { was_active: wasActiveProject });
      if (wasActiveProject) {
        onSelectProject(null);
        onSelectSession(null);
      }
    },
    [activeProjectId, removeProject, onSelectProject, onSelectSession, posthog],
  );

  return {
    allSessions,
    handleNewSession,
    handleNewProject,
    handleRenameSession,
    handleRenameProject,
    handleDeleteSession,
    handleMoveSession,
    handleDeleteProject,
  };
}
