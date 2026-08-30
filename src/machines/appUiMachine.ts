import { assign, enqueueActions, raise, setup } from "xstate";
import { timings } from "@/config";
import type { AppUiContext, AppUiEvent, SessionView, SurfaceMode } from "./appUiTypes";
import {
  reduceBatchesLengthChanged,
  reduceChatHistoryMeta,
  reduceGraphLoadingProgress,
} from "./appUiReducers";

export function sessionSelected(c: AppUiContext): boolean {
  return c.activeFileId != null || c.activeSessionId != null;
}

/** Focus layer "demand" — editor overlay (former unlimited/work path). */
export function focusLayerDemand(c: AppUiContext): boolean {
  return c.editorOpen;
}

export const appUiMachine = setup({
  types: {
    context: {} as AppUiContext,
    events: {} as AppUiEvent,
  },
  guards: {
    shouldEnterVisible: ({ context }) =>
      focusLayerDemand(context) &&
      !context.overlayDismissed &&
      sessionSelected(context),
    demandEnded: ({ context }) => !focusLayerDemand(context),
    canExitWakeUp: ({ context }) => !context.chatLoading,
    canLeaveDismissedLatch: ({ context }) => !focusLayerDemand(context),
    sessionBecameInactive: ({ event }) =>
      event.type === "ACTIVE_SESSION_SET" && event.sessionId === null,
    sessionBecameActive: ({ event }) =>
      event.type === "ACTIVE_SESSION_SET" && event.sessionId !== null,
    viewIsNotesList: ({ event }) =>
      event.type === "VIEW_SET" && event.mode === "notesList",
    viewIsGraph: ({ event }) =>
      event.type === "VIEW_SET" && event.mode === "graph",
    shouldClearForEmptyWorkspace: ({ event }) =>
      event.type === "WORKSPACE_SNAPSHOT" &&
      !event.hasProjects &&
      event.inboxEmpty,
    shouldAutoSelectFirstSession: ({ context, event }) =>
      event.type === "WORKSPACE_SNAPSHOT" &&
      event.firstFileId != null &&
      context.activeFileId == null &&
      context.activeSessionId == null &&
      !context.hasEverHadSessionSelection,
    /** Close note overlay: from graph or from Files (notes list) surface. */
    isOverlayActionReturnToGraphPath: ({ context }) => context.editorOpen,
    loadingCardsCompletedOnProgress: ({ context, event }) =>
      event.type === "GRAPH_LOADING_PROGRESS" &&
      context.graphShowLoadingCards &&
      event.latestBatchNodeCount >= context.graphLoadingCardSlots,
  },
  actions: {
    clearOnDemandEnd: assign({
      overlayDismissed: false,
    }),
    clearDismissedAfterLatch: assign({
      overlayDismissed: false,
    }),
    completeUserExit: assign({
      overlayDismissed: true,
      editorOpen: false,
    }),
    sessionCleared: assign({
      activeFileId: null,
      activeChatSessionId: null,
      chatLoading: false,
      chatThreadLoading: false,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
      graphLatestBatchNodeCount: 0,
      graphLoadingStartBatchLength: 0,
      graphReferenceFreezeActive: false,
      editorOpen: false,
      overlayDismissed: false,
      historyPanelOpen: false,
    }),
    setActiveFileId: assign({
      activeFileId: ({ event }) => {
        if (event.type !== "ACTIVE_FILE_SET") return null;
        return event.fileId;
      },
      hasEverHadSessionSelection: ({ event, context }) => {
        if (event.type !== "ACTIVE_FILE_SET") {
          return context.hasEverHadSessionSelection;
        }
        return event.fileId != null ? true : context.hasEverHadSessionSelection;
      },
      // Switching files drops the chat thread; first assignment (hydrate) keeps it.
      activeChatSessionId: ({ event, context }) => {
        if (event.type !== "ACTIVE_FILE_SET") return context.activeChatSessionId;
        if (event.fileId === context.activeFileId) {
          return context.activeChatSessionId;
        }
        if (context.activeFileId == null) return context.activeChatSessionId;
        return null;
      },
    }),
    setActiveChatSessionId: assign({
      activeChatSessionId: ({ event }) => {
        if (event.type !== "ACTIVE_CHAT_SESSION_SET") return null;
        return event.chatSessionId;
      },
    }),
    setActiveSessionId: assign({
      activeSessionId: ({ event }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return null;
        return event.sessionId;
      },
      prevBatchesLength: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return context.prevBatchesLength;
        const sid = event.sessionId;
        if (sid === null) return 0;
        // Same-session re-announcements must not wipe the batches baseline —
        // the bridge only re-sends BATCHES_LENGTH_CHANGED when length changes,
        // so resetting here leaves graphLoadingStartBatchLength wrong and skips loading skeletons.
        if (sid === context.activeSessionId) return context.prevBatchesLength;
        return 0;
      },
      hasEverHadSessionSelection: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") {
          return context.hasEverHadSessionSelection;
        }
        return event.sessionId != null ? true : context.hasEverHadSessionSelection;
      },
      chatLoading: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return context.chatLoading;
        if (event.sessionId === context.activeSessionId) return context.chatLoading;
        return false;
      },
      chatThreadLoading: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return context.chatThreadLoading;
        if (event.sessionId === context.activeSessionId) {
          return context.chatThreadLoading;
        }
        return false;
      },
      activeChatSessionId: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return context.activeChatSessionId;
        if (event.sessionId === context.activeSessionId) {
          return context.activeChatSessionId;
        }
        return null;
      },
    }),
    setActiveProject: assign({
      activeProjectId: ({ event }) => {
        if (event.type !== "ACTIVE_PROJECT_SET") return null;
        return event.projectId;
      },
    }),
    clearWorkspaceSelection: assign({
      activeFileId: () => null,
      activeChatSessionId: () => null,
      activeSessionId: () => null,
      activeProjectId: () => null,
      prevBatchesLength: () => 0,
      chatLoading: () => false,
      chatThreadLoading: () => false,
      graphLoadingStartBatchLength: () => 0,
      graphShowLoadingCards: () => false,
      graphInteractionBlocked: () => false,
      graphLatestBatchNodeCount: () => 0,
      graphReferenceFreezeActive: () => false,
    }),
    autoSelectFirstWorkspaceSession: assign({
      activeFileId: ({ event }) => {
        if (event.type !== "WORKSPACE_SNAPSHOT") return null;
        return event.firstFileId;
      },
      activeChatSessionId: () => null,
      activeSessionId: ({ event }) => {
        if (event.type !== "WORKSPACE_SNAPSHOT") return null;
        return event.firstSessionId;
      },
      activeProjectId: ({ event }) => {
        if (event.type !== "WORKSPACE_SNAPSHOT") return null;
        return event.firstProjectId;
      },
      hasEverHadSessionSelection: () => true,
      prevBatchesLength: () => 0,
      graphLoadingStartBatchLength: () => 0,
      graphShowLoadingCards: () => false,
      graphInteractionBlocked: () => false,
      graphLatestBatchNodeCount: () => 0,
      graphReferenceFreezeActive: () => false,
    }),
    setNotesListDrill: assign({
      notesListDrill: ({ event }) => {
        if (event.type !== "NOTES_LIST_DRILL_SET") return null;
        return event.drill;
      },
    }),
    setSelectedBatchIndex: assign({
      selectedBatchIndex: ({ event }) => {
        if (event.type !== "SELECTED_BATCH_INDEX_SET") return 0;
        return event.index;
      },
    }),
    setDraftInput: assign({
      draftInput: ({ event }) => {
        if (event.type !== "DRAFT_INPUT_SET") return "";
        return event.value;
      },
    }),
    setChatDraftInput: assign({
      chatDraftInput: ({ event }) => {
        if (event.type !== "CHAT_DRAFT_INPUT_SET") return "";
        return event.value;
      },
    }),
    setNotes: assign({
      notes: ({ event }) => {
        if (event.type !== "NOTES_SET") return "";
        return event.value;
      },
    }),
    startChatLoading: assign({ chatLoading: true }),
    startChatThreadLoading: assign({ chatThreadLoading: true }),
    endChatThreadLoading: assign({ chatThreadLoading: false }),
    startGraphLoading: assign(({ context }) => ({
      graphLoadingStartBatchLength: context.prevBatchesLength,
      graphShowLoadingCards: true,
      graphInteractionBlocked: true,
      graphLatestBatchNodeCount: 0,
    })),
    endChatLoading: assign({
      chatLoading: false,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
      graphLatestBatchNodeCount: 0,
      graphLoadingStartBatchLength: 0,
    }),
    setGraphReferenceFreezeActiveTrue: assign({ graphReferenceFreezeActive: true }),
    setGraphReferenceFreezeActiveFalse: assign({
      graphReferenceFreezeActive: false,
    }),
    syncChatHistoryMeta: assign(({ context, event }) =>
      reduceChatHistoryMeta(context, event as AppUiEvent),
    ),
    applyBatchesLengthChanged: assign(({ context, event }) =>
      reduceBatchesLengthChanged(context, event as AppUiEvent),
    ),
    applyGraphLoadingProgress: assign(({ context, event }) =>
      reduceGraphLoadingProgress(context, event as AppUiEvent),
    ),
    assignEditorOpenTrue: assign({ editorOpen: true }),
    assignSurfaceModeNotesList: assign({ surfaceMode: "notesList" }),
    assignSurfaceModeGraph: assign({ surfaceMode: "graph" }),
    assignSessionView: assign(({ event, context }) => {
      if (event.type !== "SESSION_VIEW_SET") return {};
      return {
        sessionView: event.view,
        historyPanelOpen:
          event.view === "chat" ? false : context.historyPanelOpen,
      };
    }),
    raiseExitWakeUp: raise({ type: "USER_EXIT_WAKE_UP" }),
    assignNotesListDrillForOpenNotesIntent: assign(({ context }) => {
      if (context.activeProjectId != null) {
        return {
          notesListDrill: {
            type: "project" as const,
            id: context.activeProjectId,
          },
        };
      }
      if (context.activeSessionId != null) {
        return { notesListDrill: { type: "inbox" as const } };
      }
      return { notesListDrill: null };
    }),
    /** Leave note overlay for graph; clears Files drill so navigation stays predictable. */
    returnToGraphFromEditor: enqueueActions(({ enqueue }) => {
      enqueue.raise({ type: "VIEW_SET", mode: "graph" });
      enqueue.raise({ type: "EDITOR_CLOSE" });
      enqueue.raise({ type: "NOTES_LIST_DRILL_SET", drill: null });
    }),
    /** Breadcrumb "Projects": Files view at root + exit overlay. */
    intentBreadcrumbProjectsRoot: enqueueActions(({ enqueue }) => {
      enqueue.raise({ type: "VIEW_SET", mode: "notesList" });
      enqueue.raise({ type: "NOTES_LIST_DRILL_SET", drill: null });
      enqueue.raise({ type: "USER_EXIT_WAKE_UP" });
    }),
    intentBreadcrumbSession: enqueueActions(({ enqueue, context }) => {
      enqueue.raise({ type: "VIEW_SET", mode: "notesList" });
      const pid = context.activeProjectId;
      if (pid != null) {
        enqueue.raise({ type: "ACTIVE_PROJECT_SET", projectId: pid });
        enqueue.raise({
          type: "NOTES_LIST_DRILL_SET",
          drill: { type: "project", id: pid },
        });
      } else {
        enqueue.raise({ type: "ACTIVE_PROJECT_SET", projectId: null });
        enqueue.raise({
          type: "NOTES_LIST_DRILL_SET",
          drill:
            context.activeSessionId != null ? { type: "inbox" } : null,
        });
      }
      enqueue.raise({ type: "USER_EXIT_WAKE_UP" });
    }),
    intentSelectSessionFromSidebar: enqueueActions(({ enqueue, event }) => {
      if (event.type !== "INTENT_SELECT_SESSION_FROM_SIDEBAR") return;
      if (event.fileId !== undefined) {
        enqueue.raise({ type: "ACTIVE_FILE_SET", fileId: event.fileId });
      }
      enqueue.raise({ type: "ACTIVE_SESSION_SET", sessionId: event.sessionId });
      if (event.sessionId != null || event.fileId != null) {
        enqueue.raise({ type: "EDITOR_OPEN" });
      }
    }),
    editorClose: assign({
      editorOpen: false,
    }),
    historyOpen: assign({ historyPanelOpen: true }),
    historyClose: assign({ historyPanelOpen: false }),
  },
}).createMachine({
  id: "appUi",
  type: "parallel",
  context: ({ input }) => {
    const inp = input as Partial<AppUiContext> | undefined;
    return {
      activeFileId: inp?.activeFileId ?? null,
      activeChatSessionId: inp?.activeChatSessionId ?? null,
      activeSessionId: inp?.activeSessionId ?? null,
      activeProjectId: inp?.activeProjectId ?? null,
      notesListDrill: inp?.notesListDrill ?? null,
      selectedBatchIndex: inp?.selectedBatchIndex ?? 0,
      prevBatchesLength: inp?.prevBatchesLength ?? 0,
      draftInput: inp?.draftInput ?? "",
      chatDraftInput: inp?.chatDraftInput ?? "",
      notes: inp?.notes ?? "",
      chatLoading: false,
      chatThreadLoading: false,
      graphLoadingStartBatchLength: 0,
      graphLoadingCardSlots: inp?.graphLoadingCardSlots ?? 6,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
      graphLatestBatchNodeCount: 0,
      graphReferenceFreezeActive: false,
      editorOpen: inp?.editorOpen ?? false,
      overlayDismissed: false,
      historyPanelOpen: false,
      hasChatHistory: false,
      messagesLoading: false,
      hasEverHadSessionSelection: inp?.hasEverHadSessionSelection ?? false,
      surfaceMode: inp?.surfaceMode ?? "notesList",
      sessionView: inp?.sessionView ?? "graph",
      sidebarCollapseRequestSeq: inp?.sidebarCollapseRequestSeq ?? 0,
      sidebarCollapseImmediateSeq: inp?.sidebarCollapseImmediateSeq ?? 0,
    };
  },
  on: {
    ACTIVE_FILE_SET: {
      actions: "setActiveFileId",
    },
    ACTIVE_CHAT_SESSION_SET: {
      actions: "setActiveChatSessionId",
    },
    ACTIVE_SESSION_SET: [
      {
        guard: "sessionBecameInactive",
        actions: ["setActiveSessionId", "sessionCleared"],
        target: ".wakeUp.off",
      },
      {
        guard: "sessionBecameActive",
        actions: "setActiveSessionId",
      },
    ],
    ACTIVE_PROJECT_SET: {
      actions: "setActiveProject",
    },
    NOTES_LIST_DRILL_SET: {
      actions: "setNotesListDrill",
    },
    SELECTED_BATCH_INDEX_SET: {
      actions: "setSelectedBatchIndex",
    },
    DRAFT_INPUT_SET: {
      actions: "setDraftInput",
    },
    CHAT_DRAFT_INPUT_SET: {
      actions: "setChatDraftInput",
    },
    CHAT_THREAD_LOADING_START: {
      actions: "startChatThreadLoading",
    },
    CHAT_THREAD_LOADING_END: {
      actions: "endChatThreadLoading",
    },
    NOTES_SET: {
      actions: "setNotes",
    },
    VIEW_SET: [
      {
        guard: "viewIsNotesList",
        actions: "assignSurfaceModeNotesList",
        target: ".surface.notesList",
      },
      {
        guard: "viewIsGraph",
        actions: "assignSurfaceModeGraph",
        target: ".surface.graph",
      },
    ],
    SESSION_VIEW_SET: {
      actions: "assignSessionView",
    },
    CHAT_HISTORY_META: {
      actions: "syncChatHistoryMeta",
    },
    BATCHES_LENGTH_CHANGED: {
      actions: "applyBatchesLengthChanged",
    },
    WORKSPACE_SNAPSHOT: [
      {
        guard: "shouldClearForEmptyWorkspace",
        actions: "clearWorkspaceSelection",
      },
      {
        guard: "shouldAutoSelectFirstSession",
        actions: "autoSelectFirstWorkspaceSession",
      },
    ],
    EDITOR_CLOSE: {
      actions: "editorClose",
    },
    INTENT_OVERLAY_ACTION_CLICK: [
      {
        guard: "isOverlayActionReturnToGraphPath",
        actions: ["returnToGraphFromEditor"],
      },
      {
        guard: "canExitWakeUp",
        actions: "raiseExitWakeUp",
      },
    ],
    INTENT_BREADCRUMB_PROJECTS_ROOT_CLICK: {
      guard: "canExitWakeUp",
      actions: "intentBreadcrumbProjectsRoot",
    },
    INTENT_BREADCRUMB_SESSION_CLICK: {
      guard: "canExitWakeUp",
      actions: "intentBreadcrumbSession",
    },
    INTENT_BREADCRUMB_FILE_CLICK: {
      actions: ["returnToGraphFromEditor"],
    },
    INTENT_OPEN_NOTES_LIST: {
      actions: ["assignNotesListDrillForOpenNotesIntent", "assignSurfaceModeNotesList"],
      target: ".surface.notesList",
    },
    INTENT_RETURN_GRAPH_FROM_EDITOR: {
      actions: ["returnToGraphFromEditor"],
    },
    INTENT_SELECT_SESSION_FROM_SIDEBAR: {
      actions: "intentSelectSessionFromSidebar",
    },
    HISTORY_OPEN: {
      actions: "historyOpen",
    },
    HISTORY_CLOSE: {
      actions: "historyClose",
    },
  },
  states: {
    surface: {
      initial: "notesList",
      states: {
        graph: {},
        notesList: {},
      },
    },
    sidebarCollapsePolicy: {
      initial: "idle",
      /** Parallel region: EDITOR_OPEN sets notes overlay without collapsing the sidebar. */
      states: {
        idle: {
          on: {
            EDITOR_OPEN: {
              actions: "assignEditorOpenTrue",
            },
          },
        },
      },
    },
    graphReferenceFreeze: {
      initial: "idle",
      on: {
        CHAT_LOADING_START: {
          actions: [
            "startChatLoading",
            "startGraphLoading",
            "setGraphReferenceFreezeActiveTrue",
          ],
          target: ".loading",
        },
        CHAT_LOADING_END: {
          actions: ["endChatLoading", "setGraphReferenceFreezeActiveTrue"],
          target: ".stabilizing",
        },
        GRAPH_LOADING_PROGRESS: [
          {
            guard: "loadingCardsCompletedOnProgress",
            actions: [
              "applyGraphLoadingProgress",
              "setGraphReferenceFreezeActiveTrue",
            ],
            target: ".stabilizing",
          },
          {
            actions: "applyGraphLoadingProgress",
          },
        ],
      },
      states: {
        idle: {},
        loading: {},
        stabilizing: {
          after: {
            [timings.graphReferenceStabilizeMs]: {
              target: "idle",
              actions: "setGraphReferenceFreezeActiveFalse",
            },
          },
        },
      },
    },
    wakeUp: {
      initial: "off",
      states: {
        off: {
          always: {
            guard: "shouldEnterVisible",
            target: "visible",
          },
        },
        visible: {
          initial: "revealing",
          on: {
            USER_EXIT_WAKE_UP: {
              target: "#appUi.wakeUp.exiting",
              guard: "canExitWakeUp",
            },
          },
          always: {
            guard: "demandEnded",
            target: "off",
            actions: "clearOnDemandEnd",
          },
          states: {
            revealing: {
              after: {
                [timings.wakeUpEditorRevealMs]: {
                  target: "ready",
                },
              },
            },
            ready: {},
          },
        },
        exiting: {
          after: {
            [timings.wakeUpExitMs]: {
              target: "dismissedLatch",
              actions: "completeUserExit",
            },
          },
          on: {
            ACTIVE_SESSION_SET: {
              guard: "sessionBecameInactive",
              target: "off",
              actions: ["setActiveSessionId", "sessionCleared"],
            },
          },
        },
        dismissedLatch: {
          always: {
            guard: "canLeaveDismissedLatch",
            target: "off",
            actions: "clearDismissedAfterLatch",
          },
        },
      },
    },
  },
});

type MachineSnapshot = import("xstate").SnapshotFrom<typeof appUiMachine>;

function wakeUpBranch(
  snapshot: MachineSnapshot,
): "off" | "visible" | "exiting" | "dismissedLatch" | null {
  const v = snapshot.value;
  if (typeof v === "object" && v !== null && "wakeUp" in v) {
    const w = (v as { wakeUp: unknown }).wakeUp;
    if (w === "off") return "off";
    if (w === "exiting") return "exiting";
    if (w === "dismissedLatch") return "dismissedLatch";
    if (typeof w === "object" && w !== null && "visible" in w) {
      return "visible";
    }
  }
  return null;
}

function surfaceState(snapshot: MachineSnapshot): SurfaceMode {
  const v = snapshot.value;
  if (typeof v === "object" && v !== null && "surface" in v) {
    const s = (v as { surface: string }).surface;
    if (s === "graph" || s === "notesList") return s;
  }
  return "notesList";
}

/** Fullscreen focus layer (wake-up) — same as previous showOverlay. */
export function selectShowWakeUpOverlay(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  return (
    focusLayerDemand(c) &&
    !c.overlayDismissed &&
    sessionSelected(c)
  );
}

/** Mount overlay container while animating out. */
export function selectDisplayWakeUpLayer(snapshot: MachineSnapshot): boolean {
  const w = wakeUpBranch(snapshot);
  return selectShowWakeUpOverlay(snapshot) || w === "exiting";
}

export function selectIsExitingWakeUp(snapshot: MachineSnapshot): boolean {
  return wakeUpBranch(snapshot) === "exiting";
}

export function selectEditorRevealReady(snapshot: MachineSnapshot): boolean {
  const v = snapshot.value;
  if (typeof v === "object" && v !== null && "wakeUp" in v) {
    const w = (v as { wakeUp: unknown }).wakeUp;
    if (typeof w === "object" && w !== null && "visible" in w) {
      return (w as { visible: string }).visible === "ready";
    }
  }
  return false;
}

export function selectChatLoadingOnGraphFrame(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.chatLoading &&
    sessionSelected(c) &&
    surfaceState(snapshot) === "graph"
  );
}

/** LLM loading while on Files — show overlay action to return to graph. */
export function selectChatLoadingOnNotesList(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.chatLoading &&
    sessionSelected(c) &&
    surfaceState(snapshot) === "notesList"
  );
}

export function selectCanExitWakeUp(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  return !c.chatLoading;
}

export function selectGraphShowLoadingCards(snapshot: MachineSnapshot): boolean {
  return snapshot.context.graphShowLoadingCards;
}

export function selectGraphInteractionBlocked(snapshot: MachineSnapshot): boolean {
  return snapshot.context.graphInteractionBlocked;
}

export function selectGraphLoadingStartBatchLength(
  snapshot: MachineSnapshot,
): number {
  return snapshot.context.graphLoadingStartBatchLength;
}

export function selectGraphReferenceFreezeActive(
  snapshot: MachineSnapshot,
): boolean {
  return snapshot.context.graphReferenceFreezeActive;
}

export function selectSurface(snapshot: MachineSnapshot): SurfaceMode {
  return surfaceState(snapshot);
}

export function selectSessionView(snapshot: MachineSnapshot): SessionView {
  return snapshot.context.sessionView;
}

/** General collapse signal token for UI elements that should close together. */
export function selectUiCollapseSignal(snapshot: MachineSnapshot): string {
  const { sidebarCollapseRequestSeq, sidebarCollapseImmediateSeq } = snapshot.context;
  return `${sidebarCollapseRequestSeq}:${sidebarCollapseImmediateSeq}`;
}

/** Editor open on graph — overlay action returns to graph from editor overlay. */
export function selectOverlayActionReturnsToGraph(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return c.editorOpen && surfaceState(snapshot) === "graph";
}

/** Whether wake overlay shows the top-right action button. */
export function selectShowOverlayAction(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  const surface = surfaceState(snapshot);
  const canExit = selectCanExitWakeUp(snapshot);
  if (!canExit) return false;
  const returnsToGraph = c.editorOpen && surface === "graph";
  const editorOnNotesList = c.editorOpen && surface === "notesList";
  const overlayStandardExit = !c.editorOpen;
  return returnsToGraph || editorOnNotesList || overlayStandardExit;
}
