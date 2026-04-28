import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import {
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
  getStoredProjectsSectionOpen,
  setStoredProjectsSectionOpen,
} from "@/lib/sidebarStorage";
import { expandProjectRowForActiveSession } from "@/lib/sidebarExpansion";
import { scrollSidebarSessionIntoView } from "@/lib/sidebarScroll";
import type {
  ProjectWithSessions,
  SessionSidebarHandle,
} from "./workspaceTypes";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

type UseSessionSidebarWorkspaceArgs = {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  onSelectSession: (id: Id<"sessions"> | null) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
  imperativeRef: ForwardedRef<SessionSidebarHandle>;
};

export function useSessionSidebarWorkspace({
  workspace,
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
  imperativeRef,
}: UseSessionSidebarWorkspaceArgs) {
  const posthog = usePostHog();
  const data = workspace;
  const createSession = useMutation(api.sessions.create);
  const createProject = useMutation(api.projects.create);
  const removeSession = useMutation(api.sessions.remove);
  const moveToProject = useMutation(api.sessions.moveToProject);
  const removeProject = useMutation(api.projects.remove);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateProjectName = useMutation(api.projects.updateName);

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dragOverProjectId, setDragOverProjectId] = useState<
    string | "inbox" | null
  >(null);
  const [editingSessionId, setEditingSessionId] = useState<Id<"sessions"> | null>(
    null,
  );
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(
    null,
  );
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] =
    useState<Id<"projects"> | null>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const projectClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isCollapsed, setIsCollapsed] = useState(getStoredSidebarCollapsed);
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(
    getStoredProjectsSectionOpen,
  );

  useEffect(() => {
    setStoredSidebarCollapsed(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    setStoredProjectsSectionOpen(projectsSectionOpen);
  }, [projectsSectionOpen]);

  useEffect(() => {
    if (!projectsSectionOpen) {
      setExpandedProjectIds(new Set());
    }
  }, [projectsSectionOpen]);

  useEffect(() => {
    if (!data) return;
    expandProjectRowForActiveSession(
      data,
      activeSessionId,
      setExpandedProjectIds,
    );
  }, [data, activeSessionId]);

  const allSessions = useMemo(
    () => data?.flatMap((g: ProjectWithSessions) => g.sessions) ?? [],
    [data],
  );

  const handleNewSession = useCallback(
    async (projectId?: Id<"projects">) => {
      const targetProjectId = projectId;
      const id = await createSession({ projectId: targetProjectId ?? undefined });
      posthog.capture("session_created", { has_project: !!targetProjectId });
      onSelectSession(id);
      if (targetProjectId) {
        onSelectProject(targetProjectId);
        setExpandedProjectIds((prev) => new Set([...prev, targetProjectId]));
      } else {
        onSelectProject(null);
      }
      window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
    },
    [createSession, onSelectSession, onSelectProject, posthog],
  );

  const handleNewProject = useCallback(async () => {
    const id = await createProject();
    posthog.capture("project_created");
    setProjectsSectionOpen(true);
    setExpandedProjectIds((prev) => new Set([...prev, id]));
  }, [createProject, posthog]);

  const toggleProjectExpanded = useCallback((projectId: string | null) => {
    if (!projectId) return;
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const handleRename = useCallback(
    async (id: Id<"sessions">, title: string) => {
      if (title?.trim()) {
        await updateTitle({ id, title: title.trim() });
        posthog.capture("session_renamed");
      }
      setEditingSessionId(null);
    },
    [updateTitle, posthog],
  );

  const handleRenameProject = useCallback(
    async (id: Id<"projects">, name: string) => {
      if (name?.trim()) {
        await updateProjectName({ id, name: name.trim() });
      }
      setEditingProjectId(null);
    },
    [updateProjectName],
  );

  useEffect(() => {
    if (editingSessionId) {
      sessionInputRef.current?.focus();
      sessionInputRef.current?.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    if (editingProjectId) {
      projectInputRef.current?.focus();
      projectInputRef.current?.select();
    }
  }, [editingProjectId]);

  const handleDelete = useCallback(
    async (id: Id<"sessions">) => {
      setConfirmDeleteSessionId(null);
      const wasActive = activeSessionId === id;
      const deletedSession = allSessions.find(
        (s: Doc<"sessions">) => s._id === id,
      );
      const projectId = deletedSession?.projectId ?? null;
      await removeSession({ id });
      posthog.capture("session_deleted", { was_active: wasActive });
      if (wasActive) {
        const remaining = allSessions.filter(
          (s: Doc<"sessions">) => s._id !== id,
        );
        const sameProject = remaining.filter(
          (s: Doc<"sessions">) => (s.projectId ?? null) === projectId,
        );
        const nextSession =
          sameProject[0] ?? (projectId != null ? remaining[0] : null) ?? null;
        onSelectSession(nextSession?._id ?? null);
        if (nextSession?.projectId) {
          onSelectProject(nextSession.projectId);
        }
      }
    },
    [
      allSessions,
      activeSessionId,
      removeSession,
      onSelectSession,
      onSelectProject,
      posthog,
    ],
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
      if (activeSessionId === sessionId && targetProjectId) {
        onSelectProject(targetProjectId);
      }
      setDragOverProjectId(null);
    },
    [allSessions, moveToProject, activeSessionId, onSelectProject, posthog],
  );

  const handleDeleteProject = useCallback(
    async (id: Id<"projects">) => {
      setConfirmDeleteProjectId(null);
      const wasActiveProject = activeProjectId === id;
      await removeProject({ id });
      posthog.capture("project_deleted", { was_active: wasActiveProject });
      if (wasActiveProject) {
        onSelectProject(null);
        onSelectSession(null);
      }
      setExpandedProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [activeProjectId, removeProject, onSelectProject, onSelectSession, posthog],
  );

  const expandIntoView = useCallback(() => {
    setIsCollapsed(false);
    expandProjectRowForActiveSession(
      data,
      activeSessionId,
      setExpandedProjectIds,
      () => setProjectsSectionOpen(true),
    );
    if (activeSessionId) {
      scrollSidebarSessionIntoView(activeSessionId);
    }
  }, [data, activeSessionId]);

  useImperativeHandle(
    imperativeRef,
    () => ({
      expand: expandIntoView,
      collapse: () => setIsCollapsed(true),
    }),
    [expandIntoView],
  );

  return {
    data,
    allSessions,
    isCollapsed,
    setIsCollapsed,
    projectsSectionOpen,
    setProjectsSectionOpen,
    expandedProjectIds,
    dragOverProjectId,
    setDragOverProjectId,
    editingSessionId,
    setEditingSessionId,
    editingProjectId,
    setEditingProjectId,
    confirmDeleteSessionId,
    setConfirmDeleteSessionId,
    confirmDeleteProjectId,
    setConfirmDeleteProjectId,
    sessionInputRef,
    projectInputRef,
    projectClickTimeoutRef,
    handleNewSession,
    handleNewProject,
    toggleProjectExpanded,
    handleRename,
    handleRenameProject,
    handleDelete,
    handleMoveSession,
    handleDeleteProject,
  };
}

export type SessionSidebarWorkspaceModel = ReturnType<
  typeof useSessionSidebarWorkspace
>;
