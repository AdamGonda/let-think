import { assign, enqueueActions, raise, setup } from "xstate";
import { timings } from "@/config";
import type { AppUiContext, AppUiEvent, SurfaceMode } from "./appUiTypes";
import {
  reduceBatchesLengthChanged,
  reduceChatHistoryMeta,
  reduceGraphLoadingProgress,
} from "./appUiReducers";

export type { AppUiContext, AppUiEvent, SurfaceMode } from "./appUiTypes";

export function sessionSelected(c: AppUiContext): boolean {
  return c.activeSessionId != null;
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
      event.firstSessionId != null &&
      context.activeSessionId == null &&
      !context.hasEverHadSessionSelection,
    isSigmaEditorReturnPath: ({ context }) =>
      context.editorOpen && context.surfaceMode === "graph",
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
      chatLoading: false,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
      graphLatestBatchNodeCount: 0,
      graphLoadingStartBatchLength: 0,
      graphReferenceFreezeActive: false,
      editorOpen: false,
      showFileNoteBreadcrumbFromProjectNotes: false,
    }),
    sessionCleared: assign({
      chatLoading: false,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
      graphLatestBatchNodeCount: 0,
      graphLoadingStartBatchLength: 0,
      graphReferenceFreezeActive: false,
      editorOpen: false,
      overlayDismissed: false,
      historyPanelOpen: false,
      showFileNoteBreadcrumbFromProjectNotes: false,
    }),
    setActiveSessionId: assign({
      activeSessionId: ({ event }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return null;
        return event.sessionId;
      },
      prevBatchesLength: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return context.prevBatchesLength;
        return 0;
      },
      hasEverHadSessionSelection: ({ event, context }) => {
        if (event.type !== "ACTIVE_SESSION_SET") {
          return context.hasEverHadSessionSelection;
        }
        return event.sessionId != null ? true : context.hasEverHadSessionSelection;
      },
    }),
    setActiveProject: assign({
      activeProjectId: ({ event }) => {
        if (event.type !== "ACTIVE_PROJECT_SET") return null;
        return event.projectId;
      },
    }),
    clearWorkspaceSelection: assign({
      activeSessionId: () => null,
      activeProjectId: () => null,
      prevBatchesLength: () => 0,
      chatLoading: () => false,
      graphLoadingStartBatchLength: () => 0,
      graphShowLoadingCards: () => false,
      graphInteractionBlocked: () => false,
      graphLatestBatchNodeCount: () => 0,
      graphReferenceFreezeActive: () => false,
      showFileNoteBreadcrumbFromProjectNotes: false,
    }),
    autoSelectFirstWorkspaceSession: assign({
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
    setNotes: assign({
      notes: ({ event }) => {
        if (event.type !== "NOTES_SET") return "";
        return event.value;
      },
    }),
    startChatLoading: assign({ chatLoading: true }),
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
    setFileNoteBreadcrumbSource: assign({
      showFileNoteBreadcrumbFromProjectNotes: ({ event }) => {
        if (event.type !== "FILE_NOTE_BREADCRUMB_SOURCE_SET") return false;
        return event.fromProjectNotesExplorer;
      },
    }),
    incrementSidebarCollapseRequestSeq: assign({
      sidebarCollapseRequestSeq: ({ context }) =>
        context.sidebarCollapseRequestSeq + 1,
    }),
    incrementSidebarCollapseImmediateSeq: assign({
      sidebarCollapseImmediateSeq: ({ context }) =>
        context.sidebarCollapseImmediateSeq + 1,
    }),
    assignSurfaceModeNotesList: assign({ surfaceMode: "notesList" }),
    assignSurfaceModeGraph: assign({ surfaceMode: "graph" }),
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
      return { notesListDrill: null };
    }),
    returnToGraphFromEditor: enqueueActions(({ enqueue }) => {
      enqueue.raise({ type: "VIEW_SET", mode: "graph" });
      enqueue.raise({ type: "EDITOR_CLOSE" });
    }),
    /** Breadcrumb "Go to session": graph + close editor + leave file-explorer drill. */
    goToSessionFromExplorerBreadcrumb: enqueueActions(({ enqueue }) => {
      enqueue.raise({ type: "VIEW_SET", mode: "graph" });
      enqueue.raise({ type: "EDITOR_CLOSE" });
      enqueue.raise({ type: "NOTES_LIST_DRILL_SET", drill: null });
    }),
    intentBreadcrumbProject: enqueueActions(({ enqueue }) => {
      enqueue.raise({ type: "NOTES_LIST_DRILL_SET", drill: null });
      enqueue.raise({ type: "USER_EXIT_WAKE_UP" });
    }),
    intentBreadcrumbSession: enqueueActions(({ enqueue, context }) => {
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
          drill: { type: "inbox" },
        });
      }
      enqueue.raise({ type: "USER_EXIT_WAKE_UP" });
    }),
    intentSelectSessionFromSidebar: enqueueActions(({ enqueue, context, event }) => {
      if (event.type !== "INTENT_SELECT_SESSION_FROM_SIDEBAR") return;
      enqueue.raise({
        type: "FILE_NOTE_BREADCRUMB_SOURCE_SET",
        fromProjectNotesExplorer: false,
      });
      const wasNotesList = context.surfaceMode === "notesList";
      enqueue.raise({ type: "ACTIVE_SESSION_SET", sessionId: event.sessionId });
      if (wasNotesList) {
        enqueue.raise({ type: "VIEW_SET", mode: "graph" });
      }
    }),
    editorClose: assign({
      editorOpen: false,
      showFileNoteBreadcrumbFromProjectNotes: false,
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
      activeSessionId: inp?.activeSessionId ?? null,
      activeProjectId: inp?.activeProjectId ?? null,
      notesListDrill: inp?.notesListDrill ?? null,
      selectedBatchIndex: inp?.selectedBatchIndex ?? 0,
      prevBatchesLength: inp?.prevBatchesLength ?? 0,
      draftInput: inp?.draftInput ?? "",
      notes: inp?.notes ?? "",
      chatLoading: false,
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
      surfaceMode: inp?.surfaceMode ?? "graph",
      sidebarCollapseRequestSeq: inp?.sidebarCollapseRequestSeq ?? 0,
      sidebarCollapseImmediateSeq: inp?.sidebarCollapseImmediateSeq ?? 0,
      showFileNoteBreadcrumbFromProjectNotes:
        inp?.showFileNoteBreadcrumbFromProjectNotes ?? false,
    };
  },
  on: {
    FILE_NOTE_BREADCRUMB_SOURCE_SET: {
      actions: "setFileNoteBreadcrumbSource",
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
    CHAT_LOADING_START: {
      actions: [
        "startChatLoading",
        "startGraphLoading",
        "setGraphReferenceFreezeActiveTrue",
      ],
      target: ".graphReferenceFreeze.loading",
    },
    CHAT_LOADING_END: {
      actions: ["endChatLoading", "setGraphReferenceFreezeActiveTrue"],
      target: ".graphReferenceFreeze.stabilizing",
    },
    GRAPH_LOADING_PROGRESS: [
      {
        guard: "loadingCardsCompletedOnProgress",
        actions: ["applyGraphLoadingProgress", "setGraphReferenceFreezeActiveTrue"],
        target: ".graphReferenceFreeze.stabilizing",
      },
      {
        actions: "applyGraphLoadingProgress",
      },
    ],
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
    INTENT_WAKE_SIGMA_CLICK: [
      {
        guard: "isSigmaEditorReturnPath",
        actions: [
          "returnToGraphFromEditor",
          "incrementSidebarCollapseImmediateSeq",
        ],
      },
      {
        guard: "canExitWakeUp",
        actions: "raiseExitWakeUp",
      },
    ],
    INTENT_BREADCRUMB_PROJECT_CLICK: {
      guard: "canExitWakeUp",
      actions: "intentBreadcrumbProject",
    },
    INTENT_BREADCRUMB_SESSION_CLICK: {
      guard: "canExitWakeUp",
      actions: "intentBreadcrumbSession",
    },
    INTENT_BREADCRUMB_FILE_CLICK: {
      actions: [
        "goToSessionFromExplorerBreadcrumb",
        "incrementSidebarCollapseImmediateSeq",
      ],
    },
    INTENT_OPEN_NOTES_LIST: {
      actions: ["assignNotesListDrillForOpenNotesIntent", "assignSurfaceModeNotesList"],
      target: ".surface.notesList",
    },
    INTENT_RETURN_GRAPH_FROM_EDITOR: {
      actions: ["returnToGraphFromEditor", "incrementSidebarCollapseImmediateSeq"],
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
      initial: "graph",
      states: {
        graph: {},
        notesList: {},
      },
    },
    sidebarCollapsePolicy: {
      initial: "idle",
      /** Handle here (not on machine root) so sibling `surface` is not reset to `graph`. */
      on: {
        EDITOR_OPEN: {
          actions: "assignEditorOpenTrue",
          target: ".pendingDelayed",
        },
      },
      states: {
        idle: {},
        pendingDelayed: {
          after: {
            [timings.sidebarCollapseAfterEditorOpenMs]: {
              target: "idle",
              actions: "incrementSidebarCollapseRequestSeq",
            },
          },
          on: {
            EDITOR_CLOSE: {
              target: "idle",
            },
          },
        },
      },
    },
    graphReferenceFreeze: {
      initial: "idle",
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
  return "graph";
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

/** LLM loading while on Files — show Σ to return to graph (overlay Σ is absent here). */
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

/** General collapse signal token for UI elements that should close together. */
export function selectUiCollapseSignal(snapshot: MachineSnapshot): string {
  const { sidebarCollapseRequestSeq, sidebarCollapseImmediateSeq } = snapshot.context;
  return `${sidebarCollapseRequestSeq}:${sidebarCollapseImmediateSeq}`;
}

/** Editor open on graph — Σ returns to graph from session editor overlay. */
export function selectSigmaEditorFromSession(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return c.editorOpen && surfaceState(snapshot) === "graph";
}

/** Whether wake overlay shows Σ (editor return or standard exit when allowed). */
export function selectShowOverlaySigma(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  const sigma = selectSigmaEditorFromSession(snapshot);
  const canExit = selectCanExitWakeUp(snapshot);
  const overlaySigmaStandardExit =
    canExit && !(c.editorOpen && surfaceState(snapshot) === "notesList");
  return sigma || overlaySigmaStandardExit;
}
