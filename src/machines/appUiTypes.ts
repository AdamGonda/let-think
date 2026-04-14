import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../lib/notesListUtils";
import type { WorkPreferenceMode } from "../lib/workPreferenceStorage";

export type SurfaceMode = "graph" | "notesList";
export type TopAppTarget = "spotify" | "game" | "file";

export type AppUiContext = {
  preference: WorkPreferenceMode;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  notesListDrill: NotesListDrill;
  selectedBatchIndex: number;
  /** Last seen batches.length from bridge (for clamp when length changes). */
  prevBatchesLength: number;
  draftInput: string;
  notes: string;
  chatLoading: boolean;
  inBreak: boolean;
  editorOpen: boolean;
  modelAwaitingDismissal: boolean;
  /** User dismissed the focus layer while demand could still be true. */
  overlayDismissed: boolean;
  historyPanelOpen: boolean;
  /** Synced from bridge for UI selectors (rest walkthrough, history rules). */
  hasChatHistory: boolean;
  messagesLoading: boolean;
  /** LocalStorage flag for active session (from bridge). */
  restWalkthroughDoneForStorage: boolean;
  /** User dismissed rest walkthrough for the current session. */
  restWalkthroughDismissed: boolean;
  /**
   * Once true, we do not auto-select the first workspace session on load.
   * Set when the user selects any session or we auto-select the first session.
   */
  hasEverHadSessionSelection: boolean;
  topAppTarget: TopAppTarget;
};

export type AppUiEvent =
  | { type: "PREFERENCE_TOGGLE" }
  | { type: "PREFERENCE_SET"; mode: WorkPreferenceMode }
  | { type: "VIEW_SET"; mode: SurfaceMode }
  | { type: "CHAT_LOADING_START" }
  | { type: "CHAT_LOADING_END" }
  | { type: "MODEL_FINISHED" }
  | { type: "BREAK_CHANGED"; inBreak: boolean }
  | { type: "CHAT_HISTORY_META"; hasChatHistory: boolean; messagesLoading: boolean }
  | {
      type: "REST_WALKTHROUGH_STORAGE_SYNC";
      doneForActiveSession: boolean;
    }
  | { type: "BATCHES_LENGTH_CHANGED"; length: number }
  | {
      type: "WORKSPACE_SNAPSHOT";
      inboxEmpty: boolean;
      hasProjects: boolean;
      firstSessionId: Id<"sessions"> | null;
      firstProjectId: Id<"projects"> | null;
    }
  | { type: "REST_WALKTHROUGH_COMPLETE" }
  | { type: "EDITOR_OPEN" }
  | { type: "EDITOR_CLOSE" }
  | { type: "USER_EXIT_WAKE_UP" }
  | { type: "ACTIVE_SESSION_SET"; sessionId: Id<"sessions"> | null }
  | { type: "ACTIVE_PROJECT_SET"; projectId: Id<"projects"> | null }
  | { type: "NOTES_LIST_DRILL_SET"; drill: NotesListDrill }
  | { type: "SELECTED_BATCH_INDEX_SET"; index: number }
  | { type: "DRAFT_INPUT_SET"; value: string }
  | { type: "NOTES_SET"; value: string }
  | { type: "HISTORY_OPEN" }
  | { type: "HISTORY_CLOSE" }
  | { type: "TOP_APP_TARGET_SET"; target: TopAppTarget };
