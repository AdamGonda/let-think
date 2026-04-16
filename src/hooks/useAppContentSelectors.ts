import { useSelector } from "@xstate/react";
import type { SnapshotFrom } from "xstate";
import { useAppUiActor } from "./useAppUi";
import {
  appUiMachine,
  selectCanExitWakeUp,
  selectDisplayWakeUpLayer,
  selectEditorRevealReady,
  selectIsExitingWakeUp,
  selectIsWorkMode,
  selectShowOverlaySigma,
  selectShowRestSessionWalkthrough,
  selectSurface,
  selectTopAppTarget,
  selectUiCollapseSignal,
  selectWorkModeNotesListDuringChatLoading,
  selectWorkModeSessionLoading,
  selectWorkSigmaEditorFromSession,
} from "../machines/appUiMachine";

type AppSnapshot = SnapshotFrom<typeof appUiMachine>;

export type AppContentSelectors = {
  activeSessionId: AppSnapshot["context"]["activeSessionId"];
  activeProjectId: AppSnapshot["context"]["activeProjectId"];
  notesListDrill: AppSnapshot["context"]["notesListDrill"];
  showFileNoteBreadcrumbFromProjectNotes: AppSnapshot["context"]["showFileNoteBreadcrumbFromProjectNotes"];
  selectedBatchIndex: AppSnapshot["context"]["selectedBatchIndex"];
  draftInput: AppSnapshot["context"]["draftInput"];
  notes: AppSnapshot["context"]["notes"];
  chatLoading: AppSnapshot["context"]["chatLoading"];
  editorOpen: AppSnapshot["context"]["editorOpen"];
  historyPanelOpen: AppSnapshot["context"]["historyPanelOpen"];
  viewMode: ReturnType<typeof selectSurface>;
  displayWakeUpLayer: ReturnType<typeof selectDisplayWakeUpLayer>;
  isExitingOverlay: ReturnType<typeof selectIsExitingWakeUp>;
  workModeSessionLoading: ReturnType<typeof selectWorkModeSessionLoading>;
  workModeNotesListDuringChatLoading: ReturnType<
    typeof selectWorkModeNotesListDuringChatLoading
  >;
  isWorkMode: ReturnType<typeof selectIsWorkMode>;
  canExitOverlay: ReturnType<typeof selectCanExitWakeUp>;
  editorRevealReady: ReturnType<typeof selectEditorRevealReady>;
  showRestSessionWalkthrough: ReturnType<
    typeof selectShowRestSessionWalkthrough
  >;
  hasChatHistory: AppSnapshot["context"]["hasChatHistory"];
  topAppTarget: ReturnType<typeof selectTopAppTarget>;
  uiCollapseSignal: ReturnType<typeof selectUiCollapseSignal>;
  workSigmaEditorFromSession: ReturnType<typeof selectWorkSigmaEditorFromSession>;
  showOverlaySigma: ReturnType<typeof selectShowOverlaySigma>;
};

function shallowEqualSelectors(
  a: AppContentSelectors,
  b: AppContentSelectors,
): boolean {
  return (
    a.activeSessionId === b.activeSessionId &&
    a.activeProjectId === b.activeProjectId &&
    a.notesListDrill === b.notesListDrill &&
    a.showFileNoteBreadcrumbFromProjectNotes ===
      b.showFileNoteBreadcrumbFromProjectNotes &&
    a.selectedBatchIndex === b.selectedBatchIndex &&
    a.draftInput === b.draftInput &&
    a.notes === b.notes &&
    a.chatLoading === b.chatLoading &&
    a.editorOpen === b.editorOpen &&
    a.historyPanelOpen === b.historyPanelOpen &&
    a.viewMode === b.viewMode &&
    a.displayWakeUpLayer === b.displayWakeUpLayer &&
    a.isExitingOverlay === b.isExitingOverlay &&
    a.workModeSessionLoading === b.workModeSessionLoading &&
    a.workModeNotesListDuringChatLoading ===
      b.workModeNotesListDuringChatLoading &&
    a.isWorkMode === b.isWorkMode &&
    a.canExitOverlay === b.canExitOverlay &&
    a.editorRevealReady === b.editorRevealReady &&
    a.showRestSessionWalkthrough === b.showRestSessionWalkthrough &&
    a.hasChatHistory === b.hasChatHistory &&
    a.topAppTarget === b.topAppTarget &&
    a.uiCollapseSignal === b.uiCollapseSignal &&
    a.workSigmaEditorFromSession === b.workSigmaEditorFromSession &&
    a.showOverlaySigma === b.showOverlaySigma
  );
}

function selectAppContentSnapshot(s: AppSnapshot): AppContentSelectors {
  return {
    activeSessionId: s.context.activeSessionId,
    activeProjectId: s.context.activeProjectId,
    notesListDrill: s.context.notesListDrill,
    showFileNoteBreadcrumbFromProjectNotes:
      s.context.showFileNoteBreadcrumbFromProjectNotes,
    selectedBatchIndex: s.context.selectedBatchIndex,
    draftInput: s.context.draftInput,
    notes: s.context.notes,
    chatLoading: s.context.chatLoading,
    editorOpen: s.context.editorOpen,
    historyPanelOpen: s.context.historyPanelOpen,
    viewMode: selectSurface(s),
    displayWakeUpLayer: selectDisplayWakeUpLayer(s),
    isExitingOverlay: selectIsExitingWakeUp(s),
    workModeSessionLoading: selectWorkModeSessionLoading(s),
    workModeNotesListDuringChatLoading:
      selectWorkModeNotesListDuringChatLoading(s),
    isWorkMode: selectIsWorkMode(s),
    canExitOverlay: selectCanExitWakeUp(s),
    editorRevealReady: selectEditorRevealReady(s),
    showRestSessionWalkthrough: selectShowRestSessionWalkthrough(s),
    hasChatHistory: s.context.hasChatHistory,
    topAppTarget: selectTopAppTarget(s),
    uiCollapseSignal: selectUiCollapseSignal(s),
    workSigmaEditorFromSession: selectWorkSigmaEditorFromSession(s),
    showOverlaySigma: selectShowOverlaySigma(s),
  };
}

/** Grouped subscriptions for the authenticated app shell (single selector + shallow compare). */
export function useAppContentSelectors(): AppContentSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectAppContentSnapshot, shallowEqualSelectors);
}
