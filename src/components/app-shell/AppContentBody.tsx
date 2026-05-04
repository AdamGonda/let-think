import { useEffect, useRef, type RefObject } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  useAppUiActor,
  useAppUiSelector,
} from "../../hooks/useAppUi";
import { useAppLayoutSelectors } from "../../hooks/useAppShellMachineSelectors";
import { useAppShellIntentHandlers } from "../../hooks/useAppContentBodyHandlers";
import { selectDisplayWakeUpLayer } from "../../machines/appUiMachine";
import {
  SessionSidebar,
  type ProjectWithSessions,
  type SessionSidebarHandle,
} from "../session-sidebar/SessionSidebar";
import { Tutorial } from "../onboarding/Tutorial";
import { runTutorial } from "@/lib/runTutorial";
import { getTutorialCompleted } from "@/lib/tutorialStorage";
import { Toaster } from "../ui/sonner";
import { WakeUpOverlayContainer } from "./WakeUpOverlayContainer";
import { WorkspaceMainColumn } from "./WorkspaceMainColumn";
import { AppShell } from "./AppShell";

type AppContentBodyProps = {
  onCreateSessionForFirstMessage?: () => Promise<Id<"sessions">>;
  workspace: ProjectWithSessions[] | undefined;
  mainContentRef: RefObject<HTMLDivElement | null>;
  sessionSidebarRef: RefObject<SessionSidebarHandle | null>;
};

export function AppContentBody({
  onCreateSessionForFirstMessage,
  workspace,
  mainContentRef,
  sessionSidebarRef,
}: AppContentBodyProps) {
  const layout = useAppLayoutSelectors();
  const displayWakeUpLayer = useAppUiSelector(selectDisplayWakeUpLayer);
  const uiCollapseSignal = useAppUiSelector(
    (s) =>
      `${s.context.sidebarCollapseRequestSeq}:${s.context.sidebarCollapseImmediateSeq}`,
  );
  const actor = useAppUiActor();
  const navigationHandlers = useAppShellIntentHandlers(actor);

  const prevCollapseSignalRef = useRef<string>("");
  const prevChatLoadingRef = useRef(false);

  useEffect(() => {
    if (uiCollapseSignal === prevCollapseSignalRef.current) return;
    prevCollapseSignalRef.current = uiCollapseSignal;
    sessionSidebarRef.current?.collapse();
  }, [uiCollapseSignal, sessionSidebarRef]);

  useEffect(() => {
    const wasLoading = prevChatLoadingRef.current;
    if (layout.chatLoading && !wasLoading) {
      sessionSidebarRef.current?.collapse();
    }
    prevChatLoadingRef.current = layout.chatLoading;
  }, [layout.chatLoading, sessionSidebarRef]);

  return (
    <AppShell
      wakeUpOverlay={<WakeUpOverlayContainer workspace={workspace} />}
      tutorial={<Tutorial autoStart={!getTutorialCompleted()} />}
      mainInert={!!displayWakeUpLayer}
      toaster={<Toaster theme="dark" />}
    >
      <SessionSidebar
        ref={sessionSidebarRef}
        workspace={workspace}
        activeSessionId={layout.activeSessionId}
        activeProjectId={layout.activeProjectId}
        onSelectSession={navigationHandlers.onSelectSessionFromSidebar}
        onSelectProject={navigationHandlers.onSelectProjectFromSidebar}
        viewMode={layout.viewMode}
        notesListMode={layout.notesListMode}
        onOpenFilesView={navigationHandlers.openFilesView}
        onOpenDiscoverView={navigationHandlers.openDiscoverView}
        onRunTutorial={runTutorial}
        isDisabled={layout.chatLoading}
      />
      <WorkspaceMainColumn
        workspace={workspace}
        mainContentRef={mainContentRef}
        sessionSidebarRef={sessionSidebarRef}
        onCreateSessionForFirstMessage={onCreateSessionForFirstMessage}
        layout={layout}
        onSelectSessionFromNotesList={
          navigationHandlers.onSelectSessionFromNotesList
        }
        onGoToSessionGraphFromNotesList={
          navigationHandlers.onGoToSessionGraphFromNotesList
        }
      />
    </AppShell>
  );
}
