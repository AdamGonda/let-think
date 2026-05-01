import { useSelector } from "@xstate/react";
import type { SnapshotFrom } from "xstate";
import { useAppUiActor } from "./useAppUi";
import {
  appUiMachine,
  selectCanExitWakeUp,
  selectDisplayWakeUpLayer,
  selectEditorRevealReady,
  selectIsExitingWakeUp,
  selectShowOverlayAction,
  selectSurface,
  selectUiCollapseSignal,
  selectChatLoadingOnNotesList,
  selectChatLoadingOnGraphFrame,
  selectGraphInteractionBlocked,
  selectGraphLoadingStartBatchLength,
  selectGraphReferenceFreezeActive,
  selectGraphShowLoadingCards,
  selectOverlayActionReturnsToGraph,
  selectPublicationRequest,
  selectPublishConfirmDialog,
} from "../machines/appUiMachine";

type AppSnapshot = SnapshotFrom<typeof appUiMachine>;

type AppContentSelectors = {
  activeSessionId: AppSnapshot["context"]["activeSessionId"];
  activeProjectId: AppSnapshot["context"]["activeProjectId"];
  notesListDrill: AppSnapshot["context"]["notesListDrill"];
  showFileNoteBreadcrumbFromProjectNotes: AppSnapshot["context"]["showFileNoteBreadcrumbFromProjectNotes"];
  selectedBatchIndex: AppSnapshot["context"]["selectedBatchIndex"];
  draftInput: AppSnapshot["context"]["draftInput"];
  notes: AppSnapshot["context"]["notes"];
  chatLoading: AppSnapshot["context"]["chatLoading"];
  graphShowLoadingCards: ReturnType<typeof selectGraphShowLoadingCards>;
  graphInteractionBlocked: ReturnType<typeof selectGraphInteractionBlocked>;
  graphLoadingStartBatchLength: ReturnType<typeof selectGraphLoadingStartBatchLength>;
  graphReferenceFreezeActive: ReturnType<typeof selectGraphReferenceFreezeActive>;
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
  uiCollapseSignal: ReturnType<typeof selectUiCollapseSignal>;
  overlayActionReturnsToGraph: ReturnType<typeof selectOverlayActionReturnsToGraph>;
  showOverlayAction: ReturnType<typeof selectShowOverlayAction>;
  publishConfirmDialog: ReturnType<typeof selectPublishConfirmDialog>;
  publicationRequest: ReturnType<typeof selectPublicationRequest>;
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
    a.graphShowLoadingCards === b.graphShowLoadingCards &&
    a.graphInteractionBlocked === b.graphInteractionBlocked &&
    a.graphLoadingStartBatchLength === b.graphLoadingStartBatchLength &&
    a.graphReferenceFreezeActive === b.graphReferenceFreezeActive &&
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
    a.uiCollapseSignal === b.uiCollapseSignal &&
    a.overlayActionReturnsToGraph === b.overlayActionReturnsToGraph &&
    a.showOverlayAction === b.showOverlayAction &&
    a.publishConfirmDialog === b.publishConfirmDialog &&
    a.publicationRequest === b.publicationRequest
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
    graphShowLoadingCards: selectGraphShowLoadingCards(s),
    graphInteractionBlocked: selectGraphInteractionBlocked(s),
    graphLoadingStartBatchLength: selectGraphLoadingStartBatchLength(s),
    graphReferenceFreezeActive: selectGraphReferenceFreezeActive(s),
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
    uiCollapseSignal: selectUiCollapseSignal(s),
    overlayActionReturnsToGraph: selectOverlayActionReturnsToGraph(s),
    showOverlayAction: selectShowOverlayAction(s),
    publishConfirmDialog: selectPublishConfirmDialog(s),
    publicationRequest: selectPublicationRequest(s),
  };
}

/** Grouped subscriptions for the authenticated app shell (single selector + shallow compare). */
export function useAppContentSelectors(): AppContentSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectAppContentSnapshot, shallowEqualSelectors);
}
