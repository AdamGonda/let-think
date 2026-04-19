import { useSelector } from "@xstate/react";
import type { SnapshotFrom } from "xstate";
import { useAppUiActor } from "./useAppUi";
import {
  appUiMachine,
  selectCanExitWakeUp,
  selectDisplayWakeUpLayer,
  selectEditorRevealReady,
  selectIsExitingWakeUp,
  selectShowOverlaySigma,
  selectSurface,
  selectTopAppTarget,
  selectUiCollapseSignal,
  selectChatLoadingOnNotesList,
  selectChatLoadingOnGraphFrame,
  selectSigmaEditorFromSession,
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
  chatLoadingOnGraphFrame: ReturnType<typeof selectChatLoadingOnGraphFrame>;
  chatLoadingOnNotesList: ReturnType<typeof selectChatLoadingOnNotesList>;
  canExitOverlay: ReturnType<typeof selectCanExitWakeUp>;
  editorRevealReady: ReturnType<typeof selectEditorRevealReady>;
  hasChatHistory: AppSnapshot["context"]["hasChatHistory"];
  topAppTarget: ReturnType<typeof selectTopAppTarget>;
  uiCollapseSignal: ReturnType<typeof selectUiCollapseSignal>;
  sigmaEditorFromSession: ReturnType<typeof selectSigmaEditorFromSession>;
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
    a.chatLoadingOnGraphFrame === b.chatLoadingOnGraphFrame &&
    a.chatLoadingOnNotesList === b.chatLoadingOnNotesList &&
    a.canExitOverlay === b.canExitOverlay &&
    a.editorRevealReady === b.editorRevealReady &&
    a.hasChatHistory === b.hasChatHistory &&
    a.topAppTarget === b.topAppTarget &&
    a.uiCollapseSignal === b.uiCollapseSignal &&
    a.sigmaEditorFromSession === b.sigmaEditorFromSession &&
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
    chatLoadingOnGraphFrame: selectChatLoadingOnGraphFrame(s),
    chatLoadingOnNotesList: selectChatLoadingOnNotesList(s),
    canExitOverlay: selectCanExitWakeUp(s),
    editorRevealReady: selectEditorRevealReady(s),
    hasChatHistory: s.context.hasChatHistory,
    topAppTarget: selectTopAppTarget(s),
    uiCollapseSignal: selectUiCollapseSignal(s),
    sigmaEditorFromSession: selectSigmaEditorFromSession(s),
    showOverlaySigma: selectShowOverlaySigma(s),
  };
}

/** Grouped subscriptions for the authenticated app shell (single selector + shallow compare). */
export function useAppContentSelectors(): AppContentSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectAppContentSnapshot, shallowEqualSelectors);
}
