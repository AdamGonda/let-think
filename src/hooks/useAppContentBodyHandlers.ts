import { useCallback, type RefObject } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import {
  clearNotesListDrill,
  closeEditor,
  exitWakeUpOverlay,
  navigateDrillToSessionContext,
  openSessionInFilesWithEditor,
  setActiveProject,
  setActiveSession,
  setDraftInput,
  setViewMode as sendViewMode,
} from "@/lib/appUiCommands";
import { findSessionInWorkspace } from "@/lib/workspaceQueries";
import { toggleAtReferenceInDraft } from "@/lib/conceptReferences";
import type { SessionSidebarHandle } from "@/components/session-sidebar/workspaceTypes";

type ActiveSessionInWorkspace = ReturnType<
  typeof findSessionInWorkspace
>;

type UseAppContentBodyHandlersArgs = {
  actor: AppUiActorRef;
  draftInput: string;
  activeSessionInWorkspace: ActiveSessionInWorkspace;
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
  canExitOverlay: boolean;
  editorOpen: boolean;
  viewMode: "graph" | "notesList";
  isWorkMode: boolean;
};

/**
 * Orchestration handlers for app shell / graph / wake-up flows (SRP: intent wiring, not layout).
 */
export function useAppContentBodyHandlers({
  actor,
  draftInput,
  activeSessionInWorkspace,
  sessionSidebarRef,
  canExitOverlay,
  editorOpen,
  viewMode,
  isWorkMode,
}: UseAppContentBodyHandlersArgs) {
  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      if (mode === "notesList") {
        if (activeSessionInWorkspace?.projectId) {
          navigateDrillToSessionContext(
            actor,
            activeSessionInWorkspace.projectId,
          );
        } else {
          clearNotesListDrill(actor);
        }
      }
      sendViewMode(actor, mode);
    },
    [actor, activeSessionInWorkspace],
  );

  const handleExitOverlay = useCallback(() => {
    if (!canExitOverlay) return;
    exitWakeUpOverlay(actor);
  }, [canExitOverlay, actor]);

  const handleReturnToGraphFromEditorOverlay = useCallback(() => {
    setViewMode("graph");
    closeEditor(actor);
  }, [setViewMode, actor]);

  const handleBreadcrumbProjectClick = useCallback(() => {
    clearNotesListDrill(actor);
    handleExitOverlay();
  }, [handleExitOverlay, actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    if (!activeSessionInWorkspace) return;
    navigateDrillToSessionContext(
      actor,
      activeSessionInWorkspace.projectId,
    );
    handleExitOverlay();
  }, [activeSessionInWorkspace, handleExitOverlay, actor]);

  const handleBreadcrumbFileClick = useCallback(() => {
    handleReturnToGraphFromEditorOverlay();
    sessionSidebarRef.current?.expand();
  }, [handleReturnToGraphFromEditorOverlay, sessionSidebarRef]);

  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      setDraftInput(
        actor,
        toggleAtReferenceInDraft(draftInput, conceptNumber),
      );
      setTimeout(() => {
        document
          .querySelector<HTMLTextAreaElement>("[data-session-input-textarea]")
          ?.focus();
      }, 0);
    },
    [actor, draftInput],
  );

  const workSigmaEditorFromSession =
    isWorkMode && editorOpen && viewMode === "graph";
  const overlaySigmaStandardExit =
    canExitOverlay && !(editorOpen && viewMode === "notesList");
  const showOverlaySigma =
    workSigmaEditorFromSession || overlaySigmaStandardExit;

  const handleWakeUpSigmaClick = useCallback(() => {
    if (workSigmaEditorFromSession) {
      handleReturnToGraphFromEditorOverlay();
    } else {
      handleExitOverlay();
    }
  }, [
    workSigmaEditorFromSession,
    handleReturnToGraphFromEditorOverlay,
    handleExitOverlay,
  ]);

  const onSelectSessionFromNotesList = useCallback(
    (session: Doc<"sessions">) => {
      openSessionInFilesWithEditor(actor, session);
    },
    [actor],
  );

  const onSelectSessionFromSidebar = useCallback(
    (id: Id<"sessions"> | null) => {
      setActiveSession(actor, id);
      if (viewMode === "notesList") setViewMode("graph");
    },
    [actor, viewMode, setViewMode],
  );

  const onSelectProjectFromSidebar = useCallback(
    (id: Id<"projects"> | null) => {
      setActiveProject(actor, id);
    },
    [actor],
  );

  return {
    setViewMode,
    handleExitOverlay,
    handleReturnToGraphFromEditorOverlay,
    handleBreadcrumbProjectClick,
    handleBreadcrumbSessionClick,
    handleBreadcrumbFileClick,
    handleCardReferenceClick,
    workSigmaEditorFromSession,
    showOverlaySigma,
    handleWakeUpSigmaClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  };
}
