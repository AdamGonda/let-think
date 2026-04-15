import { assign, enqueueActions, raise, setup } from "xstate";
import { readWorkPreference } from "../lib/workPreferenceStorage";
import { timings } from "@/config";
import type {
  AppUiContext,
  AppUiEvent,
  SurfaceMode,
  TopAppTarget,
} from "./appUiTypes";
import {
  reduceBatchesLengthChanged,
  reduceChatHistoryMeta,
} from "./appUiReducers";

export type { AppUiContext, AppUiEvent, SurfaceMode } from "./appUiTypes";

export function sessionSelected(c: AppUiContext): boolean {
  return c.activeSessionId != null;
}

/** Focus layer "demand" — same formula as previous overlayActive. */
export function focusLayerDemand(c: AppUiContext): boolean {
  if (c.preference === "work") {
    return c.inBreak || c.editorOpen;
  }
  return (
    c.chatLoading ||
    c.inBreak ||
    c.editorOpen ||
    c.modelAwaitingDismissal
  );
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
    canExitWakeUp: ({ context }) =>
      !context.chatLoading && !context.inBreak,
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
    isWorkSigmaEditorReturnPath: ({ context }) =>
      context.preference === "work" &&
      context.editorOpen &&
      context.surfaceMode === "graph",
  },
  actions: {
    togglePreference: assign({
      preference: ({ context }) =>
        context.preference === "think" ? "work" : "think",
    }),
    setPreference: assign({
      preference: ({ event }) => {
        if (event.type !== "PREFERENCE_SET") return readWorkPreference();
        return event.mode;
      },
    }),
    clearOnDemandEnd: assign({
      overlayDismissed: false,
      modelAwaitingDismissal: false,
    }),
    clearDismissedAfterLatch: assign({
      overlayDismissed: false,
      modelAwaitingDismissal: false,
    }),
    completeUserExit: assign({
      overlayDismissed: true,
      chatLoading: false,
      editorOpen: false,
      modelAwaitingDismissal: false,
    }),
    sessionCleared: assign({
      chatLoading: false,
      editorOpen: false,
      modelAwaitingDismissal: false,
      overlayDismissed: false,
      historyPanelOpen: false,
    }),
    setActiveSessionId: assign({
      activeSessionId: ({ event }) => {
        if (event.type !== "ACTIVE_SESSION_SET") return null;
        return event.sessionId;
      },
      restWalkthroughDismissed: () => false,
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
      restWalkthroughDismissed: () => false,
      prevBatchesLength: () => 0,
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
    endChatLoading: assign({ chatLoading: false }),
    modelFinishedThink: assign({
      modelAwaitingDismissal: ({ context }) =>
        context.preference === "think" ? true : context.modelAwaitingDismissal,
    }),
    setBreak: assign({
      inBreak: ({ event }) =>
        event.type === "BREAK_CHANGED" ? event.inBreak : false,
    }),
    syncChatHistoryMeta: assign(({ context, event }) =>
      reduceChatHistoryMeta(context, event as AppUiEvent),
    ),
    syncRestWalkthroughStorage: assign({
      restWalkthroughDoneForStorage: ({ event, context }) => {
        if (event.type !== "REST_WALKTHROUGH_STORAGE_SYNC") {
          return context.restWalkthroughDoneForStorage;
        }
        return event.doneForActiveSession;
      },
    }),
    applyBatchesLengthChanged: assign(({ context, event }) =>
      reduceBatchesLengthChanged(context, event as AppUiEvent),
    ),
    assignEditorOpenTrue: assign({ editorOpen: true }),
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
      const wasNotesList = context.surfaceMode === "notesList";
      enqueue.raise({ type: "ACTIVE_SESSION_SET", sessionId: event.sessionId });
      if (wasNotesList) {
        enqueue.raise({ type: "VIEW_SET", mode: "graph" });
      }
    }),
    editorClose: assign({ editorOpen: false }),
    historyOpen: assign({ historyPanelOpen: true }),
    historyClose: assign({ historyPanelOpen: false }),
    dismissRestWalkthroughUi: assign({ restWalkthroughDismissed: true }),
    setTopAppTarget: assign({
      topAppTarget: ({ event, context }) => {
        if (event.type !== "TOP_APP_TARGET_SET") return context.topAppTarget;
        return event.target;
      },
    }),
  },
}).createMachine({
  id: "appUi",
  type: "parallel",
  context: ({ input }) => {
    const inp = input as Partial<AppUiContext> | undefined;
    return {
      preference: inp?.preference ?? readWorkPreference(),
      activeSessionId: inp?.activeSessionId ?? null,
      activeProjectId: inp?.activeProjectId ?? null,
      notesListDrill: inp?.notesListDrill ?? null,
      selectedBatchIndex: inp?.selectedBatchIndex ?? 0,
      prevBatchesLength: inp?.prevBatchesLength ?? 0,
      draftInput: inp?.draftInput ?? "",
      notes: inp?.notes ?? "",
      chatLoading: false,
      inBreak: false,
      editorOpen: inp?.editorOpen ?? false,
      modelAwaitingDismissal: false,
      overlayDismissed: false,
      historyPanelOpen: false,
      hasChatHistory: false,
      messagesLoading: false,
      restWalkthroughDoneForStorage: false,
      restWalkthroughDismissed: false,
      hasEverHadSessionSelection: inp?.hasEverHadSessionSelection ?? false,
      topAppTarget: inp?.topAppTarget ?? "file",
      surfaceMode: inp?.surfaceMode ?? "graph",
      sidebarCollapseRequestSeq: inp?.sidebarCollapseRequestSeq ?? 0,
      sidebarCollapseImmediateSeq: inp?.sidebarCollapseImmediateSeq ?? 0,
    };
  },
  on: {
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
    PREFERENCE_TOGGLE: {
      actions: "togglePreference",
    },
    PREFERENCE_SET: {
      actions: "setPreference",
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
      actions: "startChatLoading",
    },
    CHAT_LOADING_END: {
      actions: "endChatLoading",
    },
    MODEL_FINISHED: {
      actions: "modelFinishedThink",
    },
    BREAK_CHANGED: {
      actions: "setBreak",
    },
    CHAT_HISTORY_META: {
      actions: "syncChatHistoryMeta",
    },
    REST_WALKTHROUGH_STORAGE_SYNC: {
      actions: "syncRestWalkthroughStorage",
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
    REST_WALKTHROUGH_COMPLETE: {
      actions: "dismissRestWalkthroughUi",
    },
    EDITOR_OPEN: {
      actions: "assignEditorOpenTrue",
      reenter: true,
      target: ".sidebarCollapsePolicy.pendingDelayed",
    },
    EDITOR_CLOSE: {
      actions: "editorClose",
    },
    INTENT_WAKE_SIGMA_CLICK: [
      {
        guard: "isWorkSigmaEditorReturnPath",
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
      actions: ["returnToGraphFromEditor", "incrementSidebarCollapseImmediateSeq"],
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
    TOP_APP_TARGET_SET: {
      actions: "setTopAppTarget",
    },
  },
  states: {
    preference: {
      initial: "ready",
      states: {
        ready: {},
      },
    },
    surface: {
      initial: "graph",
      states: {
        graph: {},
        notesList: {},
      },
    },
    sidebarCollapsePolicy: {
      initial: "idle",
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

export function selectWorkModeSessionLoading(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.preference === "work" &&
    c.chatLoading &&
    sessionSelected(c) &&
    surfaceState(snapshot) === "graph"
  );
}

/** Work mode + LLM loading while on Files — show Σ to return to graph (overlay Σ is absent here). */
export function selectWorkModeNotesListDuringChatLoading(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.preference === "work" &&
    c.chatLoading &&
    sessionSelected(c) &&
    surfaceState(snapshot) === "notesList"
  );
}

export function selectCanExitWakeUp(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  return !c.chatLoading && !c.inBreak;
}

export function selectIsWorkMode(snapshot: MachineSnapshot): boolean {
  return snapshot.context.preference === "work";
}

export function selectSurface(snapshot: MachineSnapshot): SurfaceMode {
  return surfaceState(snapshot);
}

export function selectTopAppTarget(snapshot: MachineSnapshot): TopAppTarget {
  return snapshot.context.topAppTarget;
}

/** Work mode: editor open on graph — Σ returns to graph from session editor overlay. */
export function selectWorkSigmaEditorFromSession(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.preference === "work" &&
    c.editorOpen &&
    surfaceState(snapshot) === "graph"
  );
}

/** Whether wake overlay shows Σ (work editor return or standard exit when allowed). */
export function selectShowOverlaySigma(snapshot: MachineSnapshot): boolean {
  const c = snapshot.context;
  const workSigma = selectWorkSigmaEditorFromSession(snapshot);
  const canExit = selectCanExitWakeUp(snapshot);
  const overlaySigmaStandardExit =
    canExit && !(c.editorOpen && surfaceState(snapshot) === "notesList");
  return workSigma || overlaySigmaStandardExit;
}

/** Rest-session empty-thread walkthrough (think mode). */
export function selectShowRestSessionWalkthrough(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.preference === "think" &&
    sessionSelected(c) &&
    !c.messagesLoading &&
    !c.hasChatHistory &&
    !c.restWalkthroughDoneForStorage &&
    !c.restWalkthroughDismissed
  );
}
