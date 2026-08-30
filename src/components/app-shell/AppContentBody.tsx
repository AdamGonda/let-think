import { type RefObject } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppUiActor, useAppUiSelector } from "../../hooks/useAppUi";
import { useAppLayoutSelectors } from "../../hooks/useAppShellMachineSelectors";
import { useAppShellIntentHandlers } from "../../hooks/useAppContentBodyHandlers";
import { selectDisplayWakeUpLayer } from "../../machines/appUiMachine";
import type { MainColumnWidthControls } from "@/hooks/useMainColumnWidth";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
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
  mainColumnWidth: MainColumnWidthControls;
};

export function AppContentBody({
  onCreateSessionForFirstMessage,
  workspace,
  mainContentRef,
  mainColumnWidth,
}: AppContentBodyProps) {
  const layout = useAppLayoutSelectors();
  const displayWakeUpLayer = useAppUiSelector(selectDisplayWakeUpLayer);
  const actor = useAppUiActor();
  const navigationHandlers = useAppShellIntentHandlers(actor);

  return (
    <AppShell
      wakeUpOverlay={
        <WakeUpOverlayContainer
          workspace={workspace}
          mainColumnWidth={mainColumnWidth}
        />
      }
      tutorial={<Tutorial autoStart={!getTutorialCompleted()} />}
      mainInert={!!displayWakeUpLayer}
      toaster={<Toaster theme="dark" />}
    >
      <WorkspaceMainColumn
        workspace={workspace}
        mainContentRef={mainContentRef}
        onCreateSessionForFirstMessage={onCreateSessionForFirstMessage}
        layout={layout}
        onSelectSessionFromNotesList={
          navigationHandlers.onSelectSessionFromNotesList
        }
        onRunTutorial={runTutorial}
      />
    </AppShell>
  );
}
