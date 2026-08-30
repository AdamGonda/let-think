import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  ProjectWithSessions,
  WorkspaceFile,
} from "@/components/session-sidebar/workspaceTypes";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

type UseWorkspaceActionsArgs = {
  workspace: ProjectWithSessions[] | undefined;
  activeFileId: Id<"files"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectFile: (
    fileId: Id<"files"> | null,
    sessionId: Id<"sessions"> | null,
    projectId?: Id<"projects"> | null,
  ) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
};

export function useWorkspaceActions({
  workspace,
  activeFileId,
  activeProjectId,
  onSelectFile,
  onSelectProject,
}: UseWorkspaceActionsArgs) {
  const posthog = usePostHog();
  const createFile = useMutation(api.files.create);
  const createProject = useMutation(api.projects.create);
  const removeFile = useMutation(api.files.remove);
  const moveToProject = useMutation(api.files.moveToProject);
  const removeProject = useMutation(api.projects.remove);
  const updateTitle = useMutation(api.files.updateTitle);
  const updateProjectName = useMutation(api.projects.updateName);

  const allFiles = useMemo(
    () => workspace?.flatMap((g: ProjectWithSessions) => g.files ?? []) ?? [],
    [workspace],
  );

  const handleNewSession = useCallback(
    async (projectId?: Id<"projects">) => {
      const created = await createFile({ projectId: projectId ?? undefined });
      posthog.capture("session_created", { has_project: !!projectId });
      onSelectFile(created.fileId, created.sessionId, projectId ?? null);
      window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
      return created;
    },
    [createFile, onSelectFile, posthog],
  );

  const handleNewProject = useCallback(async () => {
    const id = await createProject();
    posthog.capture("project_created");
    return id;
  }, [createProject, posthog]);

  const handleRenameSession = useCallback(
    async (id: Id<"files">, title: string) => {
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
    async (id: Id<"files">) => {
      const wasActive = activeFileId === id;
      await removeFile({ id });
      posthog.capture("session_deleted", { was_active: wasActive });
      if (wasActive) {
        onSelectFile(null, null);
      }
    },
    [activeFileId, removeFile, onSelectFile, posthog],
  );

  const handleMoveSession = useCallback(
    async (
      fileId: Id<"files">,
      targetProjectId: Id<"projects"> | null,
    ) => {
      const file = allFiles.find((s: WorkspaceFile) => s._id === fileId);
      if ((file?.projectId ?? null) === targetProjectId) return;
      await moveToProject({
        id: fileId,
        projectId: targetProjectId ?? undefined,
      });
      posthog.capture("session_moved_to_project", {
        to_inbox: targetProjectId === null,
      });
      if (activeFileId === fileId) {
        onSelectProject(targetProjectId);
      }
    },
    [allFiles, moveToProject, activeFileId, onSelectProject, posthog],
  );

  const handleDeleteProject = useCallback(
    async (id: Id<"projects">) => {
      const wasActiveProject = activeProjectId === id;
      await removeProject({ id });
      posthog.capture("project_deleted", { was_active: wasActiveProject });
      if (wasActiveProject) {
        onSelectProject(null);
        onSelectFile(null, null);
      }
    },
    [activeProjectId, removeProject, onSelectProject, onSelectFile, posthog],
  );

  return {
    allSessions: allFiles,
    handleNewSession,
    handleNewProject,
    handleRenameSession,
    handleRenameProject,
    handleDeleteSession,
    handleMoveSession,
    handleDeleteProject,
  };
}
