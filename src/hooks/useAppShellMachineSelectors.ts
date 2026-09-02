import { useSelector } from "@xstate/react";
import type { SnapshotFrom } from "xstate";
import { useAppUiActor } from "./useAppUi";
import {
  appUiMachine,
  selectChatLoadingOnGraphFrame,
  selectChatLoadingOnNotesList,
  selectGraphInteractionBlocked,
  selectGraphLoadingStartBatchLength,
  selectGraphReferenceFreezeActive,
  selectGraphShowLoadingCards,
  selectIsExitingWakeUp,
  selectOverlayActionReturnsToGraph,
  selectSessionView,
  selectSurface,
  selectUiCollapseSignal,
  selectChatThreadLoading,
} from "../machines/appUiMachine";

type AppSnapshot = SnapshotFrom<typeof appUiMachine>;

/** Sidebar, routing, session chrome — excludes overlay/graph/chat-dock-only fields where possible. */
export type AppLayoutSelectors = {
  activeFileId: AppSnapshot["context"]["activeFileId"];
  activeChatSessionId: AppSnapshot["context"]["activeChatSessionId"];
  activeSessionId: AppSnapshot["context"]["activeSessionId"];
  activeProjectId: AppSnapshot["context"]["activeProjectId"];
  notesListDrill: AppSnapshot["context"]["notesListDrill"];
  viewMode: ReturnType<typeof selectSurface>;
  chatLoading: AppSnapshot["context"]["chatLoading"];
};

function shallowEqualLayout(a: AppLayoutSelectors, b: AppLayoutSelectors): boolean {
  return (
    a.activeFileId === b.activeFileId &&
    a.activeChatSessionId === b.activeChatSessionId &&
    a.activeSessionId === b.activeSessionId &&
    a.activeProjectId === b.activeProjectId &&
    a.notesListDrill === b.notesListDrill &&
    a.viewMode === b.viewMode &&
    a.chatLoading === b.chatLoading
  );
}

function selectLayoutSnapshot(s: AppSnapshot): AppLayoutSelectors {
  return {
    activeFileId: s.context.activeFileId,
    activeChatSessionId: s.context.activeChatSessionId,
    activeSessionId: s.context.activeSessionId,
    activeProjectId: s.context.activeProjectId,
    notesListDrill: s.context.notesListDrill,
    viewMode: selectSurface(s),
    chatLoading: s.context.chatLoading,
  };
}

export function useAppLayoutSelectors(): AppLayoutSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectLayoutSnapshot, shallowEqualLayout);
}

/** Wake-up / notes overlay — isolated from graph loading progress updates. */
export type WakeUpOverlaySelectors = {
  chatLoading: AppSnapshot["context"]["chatLoading"];
  isExitingOverlay: ReturnType<typeof selectIsExitingWakeUp>;
  editorOpen: AppSnapshot["context"]["editorOpen"];
  overlayActionReturnsToGraph: ReturnType<typeof selectOverlayActionReturnsToGraph>;
  notes: AppSnapshot["context"]["notes"];
  activeFileId: AppSnapshot["context"]["activeFileId"];
  activeSessionId: AppSnapshot["context"]["activeSessionId"];
};

function shallowEqualWakeUp(a: WakeUpOverlaySelectors, b: WakeUpOverlaySelectors): boolean {
  return (
    a.chatLoading === b.chatLoading &&
    a.isExitingOverlay === b.isExitingOverlay &&
    a.editorOpen === b.editorOpen &&
    a.overlayActionReturnsToGraph === b.overlayActionReturnsToGraph &&
    a.notes === b.notes &&
    a.activeFileId === b.activeFileId &&
    a.activeSessionId === b.activeSessionId
  );
}

/** Exported for tests — overlay subtree should not change on graph-only machine updates. */
export function selectWakeUpOverlayModel(s: AppSnapshot): WakeUpOverlaySelectors {
  return {
    chatLoading: s.context.chatLoading,
    isExitingOverlay: selectIsExitingWakeUp(s),
    editorOpen: s.context.editorOpen,
    overlayActionReturnsToGraph: selectOverlayActionReturnsToGraph(s),
    notes: s.context.notes,
    activeFileId: s.context.activeFileId,
    activeSessionId: s.context.activeSessionId,
  };
}

export function useWakeUpOverlaySelectors(): WakeUpOverlaySelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectWakeUpOverlayModel, shallowEqualWakeUp);
}

/** Concept graph area + reference-freeze effects — draft + batch + graph flags. */
export type GraphSurfaceMachineSelectors = {
  draftInput: AppSnapshot["context"]["draftInput"];
  selectedBatchIndex: AppSnapshot["context"]["selectedBatchIndex"];
  chatLoading: AppSnapshot["context"]["chatLoading"];
  graphShowLoadingCards: ReturnType<typeof selectGraphShowLoadingCards>;
  graphInteractionBlocked: ReturnType<typeof selectGraphInteractionBlocked>;
  graphLoadingStartBatchLength: ReturnType<typeof selectGraphLoadingStartBatchLength>;
  graphReferenceFreezeActive: ReturnType<typeof selectGraphReferenceFreezeActive>;
  hasChatHistory: AppSnapshot["context"]["hasChatHistory"];
  sessionView: ReturnType<typeof selectSessionView>;
  chatThreadLoading: ReturnType<typeof selectChatThreadLoading>;
};

function shallowEqualGraphSurface(
  a: GraphSurfaceMachineSelectors,
  b: GraphSurfaceMachineSelectors,
): boolean {
  return (
    a.draftInput === b.draftInput &&
    a.selectedBatchIndex === b.selectedBatchIndex &&
    a.chatLoading === b.chatLoading &&
    a.graphShowLoadingCards === b.graphShowLoadingCards &&
    a.graphInteractionBlocked === b.graphInteractionBlocked &&
    a.graphLoadingStartBatchLength === b.graphLoadingStartBatchLength &&
    a.graphReferenceFreezeActive === b.graphReferenceFreezeActive &&
    a.hasChatHistory === b.hasChatHistory &&
    a.sessionView === b.sessionView &&
    a.chatThreadLoading === b.chatThreadLoading
  );
}

/** Exported for tests — graph subtree reacts to loading progress, not wake notes. */
export function selectGraphSurfaceMachineModel(
  s: AppSnapshot,
): GraphSurfaceMachineSelectors {
  return {
    draftInput: s.context.draftInput,
    selectedBatchIndex: s.context.selectedBatchIndex,
    chatLoading: s.context.chatLoading,
    graphShowLoadingCards: selectGraphShowLoadingCards(s),
    graphInteractionBlocked: selectGraphInteractionBlocked(s),
    graphLoadingStartBatchLength: selectGraphLoadingStartBatchLength(s),
    graphReferenceFreezeActive: selectGraphReferenceFreezeActive(s),
    hasChatHistory: s.context.hasChatHistory,
    sessionView: selectSessionView(s),
    chatThreadLoading: selectChatThreadLoading(s),
  };
}

export function useGraphSurfaceMachineSelectors(): GraphSurfaceMachineSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectGraphSurfaceMachineModel, shallowEqualGraphSurface);
}

/** Chat composer + history panel dock. */
export type ChatDockMachineSelectors = {
  draftInput: AppSnapshot["context"]["draftInput"];
  chatDraftInput: AppSnapshot["context"]["chatDraftInput"];
  chatLoading: AppSnapshot["context"]["chatLoading"];
  chatThreadLoading: ReturnType<typeof selectChatThreadLoading>;
  chatLoadingOnGraphFrame: ReturnType<typeof selectChatLoadingOnGraphFrame>;
  chatLoadingOnNotesList: ReturnType<typeof selectChatLoadingOnNotesList>;
  uiCollapseSignal: ReturnType<typeof selectUiCollapseSignal>;
  historyPanelOpen: AppSnapshot["context"]["historyPanelOpen"];
  viewMode: ReturnType<typeof selectSurface>;
  sessionView: ReturnType<typeof selectSessionView>;
  selectedBatchIndex: AppSnapshot["context"]["selectedBatchIndex"];
};

function shallowEqualChatDock(a: ChatDockMachineSelectors, b: ChatDockMachineSelectors): boolean {
  return (
    a.draftInput === b.draftInput &&
    a.chatDraftInput === b.chatDraftInput &&
    a.chatLoading === b.chatLoading &&
    a.chatThreadLoading === b.chatThreadLoading &&
    a.chatLoadingOnGraphFrame === b.chatLoadingOnGraphFrame &&
    a.chatLoadingOnNotesList === b.chatLoadingOnNotesList &&
    a.uiCollapseSignal === b.uiCollapseSignal &&
    a.historyPanelOpen === b.historyPanelOpen &&
    a.viewMode === b.viewMode &&
    a.sessionView === b.sessionView &&
    a.selectedBatchIndex === b.selectedBatchIndex
  );
}

export function selectChatDockMachineModel(s: AppSnapshot): ChatDockMachineSelectors {
  return {
    draftInput: s.context.draftInput,
    chatDraftInput: s.context.chatDraftInput,
    chatLoading: s.context.chatLoading,
    chatThreadLoading: selectChatThreadLoading(s),
    chatLoadingOnGraphFrame: selectChatLoadingOnGraphFrame(s),
    chatLoadingOnNotesList: selectChatLoadingOnNotesList(s),
    uiCollapseSignal: selectUiCollapseSignal(s),
    historyPanelOpen: s.context.historyPanelOpen,
    viewMode: selectSurface(s),
    sessionView: selectSessionView(s),
    selectedBatchIndex: s.context.selectedBatchIndex,
  };
}

export function useChatDockMachineSelectors(): ChatDockMachineSelectors {
  const actor = useAppUiActor();
  return useSelector(actor, selectChatDockMachineModel, shallowEqualChatDock);
}
