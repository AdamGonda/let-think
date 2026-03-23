import { assign, setup } from "xstate";
import {
  readWorkPreference,
  writeWorkPreference,
  type WorkPreferenceMode,
} from "../lib/workPreferenceStorage";

export type SurfaceMode = "graph" | "notesList";

export type AppUiContext = {
  preference: WorkPreferenceMode;
  /** Whether a session is selected (from Jotai; synced via events). */
  sessionActive: boolean;
  chatLoading: boolean;
  inBreak: boolean;
  editorOpen: boolean;
  modelAwaitingDismissal: boolean;
  /** User dismissed the focus layer while demand could still be true. */
  overlayDismissed: boolean;
  historyPanelOpen: boolean;
};

export type AppUiEvent =
  | { type: "PREFERENCE_TOGGLE" }
  | { type: "PREFERENCE_SET"; mode: WorkPreferenceMode }
  | { type: "VIEW_SET"; mode: SurfaceMode }
  | { type: "CHAT_LOADING_START" }
  | { type: "CHAT_LOADING_END" }
  | { type: "MODEL_FINISHED" }
  | { type: "BREAK_CHANGED"; inBreak: boolean }
  | { type: "EDITOR_OPEN" }
  | { type: "EDITOR_CLOSE" }
  | { type: "USER_EXIT_WAKE_UP" }
  | { type: "SESSION_SYNC"; active: boolean }
  | { type: "HISTORY_OPEN" }
  | { type: "HISTORY_CLOSE" };

const WAKE_UP_EXIT_MS = 300;

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
      context.sessionActive,
    demandEnded: ({ context }) => !focusLayerDemand(context),
    canExitWakeUp: ({ context }) =>
      !context.chatLoading && !context.inBreak,
    canLeaveDismissedLatch: ({ context }) => !focusLayerDemand(context),
    sessionBecameInactive: ({ event }) =>
      event.type === "SESSION_SYNC" && !event.active,
    sessionBecameActive: ({ event }) =>
      event.type === "SESSION_SYNC" && event.active,
    viewIsNotesList: ({ event }) =>
      event.type === "VIEW_SET" && event.mode === "notesList",
    viewIsGraph: ({ event }) =>
      event.type === "VIEW_SET" && event.mode === "graph",
  },
  actions: {
    persistPreference: ({ context }) => {
      writeWorkPreference(context.preference);
    },
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
      sessionActive: false,
      chatLoading: false,
      editorOpen: false,
      modelAwaitingDismissal: false,
      overlayDismissed: false,
      historyPanelOpen: false,
    }),
    sessionActiveTrue: assign({ sessionActive: true }),
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
    editorOpenTrue: assign({ editorOpen: true }),
    editorClose: assign({ editorOpen: false }),
    historyOpen: assign({ historyPanelOpen: true }),
    historyClose: assign({ historyPanelOpen: false }),
  },
}).createMachine({
  id: "appUi",
  type: "parallel",
  context: ({ input }) => {
    const inp = input as Partial<AppUiContext> | undefined;
    return {
      preference: inp?.preference ?? readWorkPreference(),
      surface: "graph",
      sessionActive: false,
      chatLoading: false,
      inBreak: false,
      editorOpen: false,
      modelAwaitingDismissal: false,
      overlayDismissed: false,
      historyPanelOpen: false,
    };
  },
  on: {
    SESSION_SYNC: [
      {
        guard: "sessionBecameInactive",
        actions: "sessionCleared",
        target: ".wakeUp.off",
      },
      {
        guard: "sessionBecameActive",
        actions: "sessionActiveTrue",
      },
    ],
    PREFERENCE_TOGGLE: {
      actions: ["togglePreference", "persistPreference"],
    },
    PREFERENCE_SET: {
      actions: ["setPreference", "persistPreference"],
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
          always: {
            guard: "demandEnded",
            target: "off",
            actions: "clearOnDemandEnd",
          },
          on: {
            USER_EXIT_WAKE_UP: {
              target: "exiting",
              guard: "canExitWakeUp",
            },
          },
        },
        exiting: {
          after: {
            [WAKE_UP_EXIT_MS]: {
              target: "dismissedLatch",
              actions: "completeUserExit",
            },
          },
          on: {
            SESSION_SYNC: {
              guard: "sessionBecameInactive",
              target: "off",
              actions: "sessionCleared",
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

function wakeUpState(snapshot: MachineSnapshot): "off" | "visible" | "exiting" | "dismissedLatch" {
  const v = snapshot.value;
  if (typeof v === "object" && v !== null && "wakeUp" in v) {
    const w = (v as { wakeUp: string }).wakeUp;
    if (w === "off" || w === "visible" || w === "exiting" || w === "dismissedLatch")
      return w;
  }
  return "off";
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
    c.sessionActive
  );
}

/** Mount overlay container while animating out. */
export function selectDisplayWakeUpLayer(snapshot: MachineSnapshot): boolean {
  const w = wakeUpState(snapshot);
  return selectShowWakeUpOverlay(snapshot) || w === "exiting";
}

export function selectIsExitingWakeUp(snapshot: MachineSnapshot): boolean {
  return wakeUpState(snapshot) === "exiting";
}

export function selectWorkModeSessionLoading(
  snapshot: MachineSnapshot,
): boolean {
  const c = snapshot.context;
  return (
    c.preference === "work" &&
    c.chatLoading &&
    c.sessionActive &&
    surfaceState(snapshot) === "graph"
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

export { WAKE_UP_EXIT_MS };
