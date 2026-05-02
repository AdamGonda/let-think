import { useCallback, useMemo } from "react";
import { useAppUiActor, useAppUiSelector } from "../../hooks/useAppUi";
import { useWakeUpOverlaySelectors } from "../../hooks/useAppShellMachineSelectors";
import { selectDisplayWakeUpLayer } from "../../machines/appUiMachine";
import { findSessionInWorkspace } from "../../lib/workspaceQueries";
import {
  intentBreadcrumbProjectsRootClick,
  intentBreadcrumbSessionClick,
  intentOverlayActionClick,
  setWakeNotes,
} from "@/lib/appUiCommands";
import { WakeUpOverlay } from "../onboarding/WakeUpOverlay";
import type { ProjectWithSessions } from "../session-sidebar/SessionSidebar";

type WakeUpOverlayContainerProps = {
  workspace: ProjectWithSessions[] | undefined;
};

/**
 * Subscribes only to wake-up overlay machine fields — not graph loading progress / batch events.
 */
export function WakeUpOverlayContainer({ workspace }: WakeUpOverlayContainerProps) {
  const displayLayer = useAppUiSelector(selectDisplayWakeUpLayer);
  const actor = useAppUiActor();
  const overlay = useWakeUpOverlaySelectors();

  const activeSessionInWorkspace = useMemo(
    () => findSessionInWorkspace(workspace, overlay.activeSessionId),
    [workspace, overlay.activeSessionId],
  );

  const handleWakeNotesChange = useCallback(
    (value: string) => {
      setWakeNotes(actor, value);
    },
    [actor],
  );

  const handleOverlayActionClick = useCallback(() => {
    intentOverlayActionClick(actor);
  }, [actor]);

  const handleBreadcrumbProjectsRootClick = useCallback(() => {
    intentBreadcrumbProjectsRootClick(actor);
  }, [actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    intentBreadcrumbSessionClick(actor);
  }, [actor]);

  if (!displayLayer) return null;

  return (
    <WakeUpOverlay
      chatLoading={overlay.chatLoading}
      isExitingOverlay={overlay.isExitingOverlay}
      editorOpen={overlay.editorOpen}
      overlayActionReturnsToGraph={overlay.overlayActionReturnsToGraph}
      onOverlayActionClick={handleOverlayActionClick}
      editorRevealReady={overlay.editorRevealReady}
      activeSessionId={overlay.activeSessionId}
      activeSessionInWorkspace={activeSessionInWorkspace}
      notes={overlay.notes}
      notesSelectionRange={null}
      onNotesChange={handleWakeNotesChange}
      onBreadcrumbProjectsRootClick={handleBreadcrumbProjectsRootClick}
      onBreadcrumbProjectNameClick={handleBreadcrumbSessionClick}
    />
  );
}
