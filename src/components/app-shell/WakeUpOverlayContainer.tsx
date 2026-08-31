import { useCallback, useMemo } from "react";
import { useAppUiActor, useAppUiSelector } from "../../hooks/useAppUi";
import { useWakeUpOverlaySelectors } from "../../hooks/useAppShellMachineSelectors";
import { selectDisplayWakeUpLayer } from "../../machines/appUiMachine";
import { findFileBySessionId, findFileInWorkspace } from "../../lib/workspaceQueries";
import {
  intentBreadcrumbProjectsRootClick,
  intentBreadcrumbSessionClick,
  intentOverlayActionClick,
  setSessionView,
  setWakeNotes,
} from "@/lib/appUiCommands";
import type { MainColumnWidthControls } from "@/hooks/useMainColumnWidth";
import { WakeUpOverlay } from "../onboarding/WakeUpOverlay";
import type { WorkspaceChromeView } from "../concept-graph-overlay/SessionViewSwitcher";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

type WakeUpOverlayContainerProps = {
  workspace: ProjectWithSessions[] | undefined;
  mainColumnWidth: MainColumnWidthControls;
};

/**
 * Subscribes only to wake-up overlay machine fields — not graph loading progress / batch events.
 */
export function WakeUpOverlayContainer({
  workspace,
  mainColumnWidth,
}: WakeUpOverlayContainerProps) {
  const displayLayer = useAppUiSelector(selectDisplayWakeUpLayer);
  const actor = useAppUiActor();
  const overlay = useWakeUpOverlaySelectors();

  const activeFileInWorkspace = useMemo(
    () =>
      findFileInWorkspace(workspace, overlay.activeFileId) ??
      findFileBySessionId(workspace, overlay.activeSessionId),
    [workspace, overlay.activeFileId, overlay.activeSessionId],
  );

  const handleWakeNotesChange = useCallback(
    (value: string) => {
      setWakeNotes(actor, value);
    },
    [actor],
  );

  const handleChromeViewChange = useCallback(
    (view: WorkspaceChromeView) => {
      if (view === "file") return;
      setSessionView(actor, view);
      const shouldFocusComposer =
        overlay.overlayActionReturnsToGraph && view !== "canvas";
      intentOverlayActionClick(actor);
      if (shouldFocusComposer) {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
        });
      }
    },
    [actor, overlay.overlayActionReturnsToGraph],
  );

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
      editorRevealReady={overlay.editorRevealReady}
      onChromeViewChange={handleChromeViewChange}
      activeSessionId={overlay.activeSessionId}
      activeSessionInWorkspace={activeFileInWorkspace}
      notes={overlay.notes}
      notesSelectionRange={null}
      onNotesChange={handleWakeNotesChange}
      onBreadcrumbProjectsRootClick={handleBreadcrumbProjectsRootClick}
      onBreadcrumbProjectNameClick={handleBreadcrumbSessionClick}
      mainColumnWidth={mainColumnWidth.width}
      mainColumnWidthMin={mainColumnWidth.min}
      mainColumnWidthMax={mainColumnWidth.max}
      onMainColumnWidthChange={mainColumnWidth.setWidth}
    />
  );
}
