import { assign, setup } from "xstate";
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
    editorOpenTrue: assign({
      editorOpen: true,
      sidebarCollapseRequestSeq: ({ context }) =>
        context.sidebarCollapseRequestSeq + 1,
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
      editorOpen: false,
      modelAwaitingDismissal: false,
      overlayDismissed: false,
      historyPanelOpen: false,
      hasChatHistory: false,
      messagesLoading: false,
      restWalkthroughDoneForStorage: false,
      restWalkthroughDismissed: false,
      hasEverHadSessionSelection: inp?.hasEverHadSessionSelection ?? false,
      topAppTarget: inp?.topAppTarget ?? "file",
      sidebarCollapseRequestSeq: inp?.sidebarCollapseRequestSeq ?? 0,
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
        target: ".surface.notesList",
      },
      {
        guard: "viewIsGraph",
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
      actions: "editorOpenTrue",
    },
    EDITOR_CLOSE: {
      actions: "editorClose",
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
