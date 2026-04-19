import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../lib/notesListUtils";

export type SurfaceMode = "graph" | "notesList";
export type TopAppTarget = "spotify" | "game" | "file";

export type AppUiContext = {
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  notesListDrill: NotesListDrill;
  selectedBatchIndex: number;
  /** Last seen batches.length from bridge (for clamp when length changes). */
  prevBatchesLength: number;
  draftInput: string;
  notes: string;
  chatLoading: boolean;
  editorOpen: boolean;
  /** User dismissed the focus layer while demand could still be true. */
  overlayDismissed: boolean;
  historyPanelOpen: boolean;
  /** Synced from bridge for UI selectors (history rules). */
  hasChatHistory: boolean;
  messagesLoading: boolean;
  /**
   * Once true, we do not auto-select the first workspace session on load.
   * Set when the user selects any session or we auto-select the first session.
   */
  hasEverHadSessionSelection: boolean;
  topAppTarget: TopAppTarget;
  /** Mirrors `surface` parallel state for guards that only receive `context`. */
  surfaceMode: SurfaceMode;
  /** Monotonic token: UI collapses sidebar after delayed open-editor policy (machine timers). */
  sidebarCollapseRequestSeq: number;
  /** Monotonic token: UI collapses sidebar immediately (return-to-graph, etc.). */
  sidebarCollapseImmediateSeq: number;
  /**
   * File overlay breadcrumb only after opening a session from the Project notes grid
   * (`openSessionInFilesWithEditor`), not from the sidebar project tree.
   */
  showFileNoteBreadcrumbFromProjectNotes: boolean;
};

export type AppUiEvent =
  | { type: "VIEW_SET"; mode: SurfaceMode }
  | { type: "CHAT_LOADING_START" }
  | { type: "CHAT_LOADING_END" }
  | { type: "CHAT_HISTORY_META"; hasChatHistory: boolean; messagesLoading: boolean }
  | { type: "BATCHES_LENGTH_CHANGED"; length: number }
  | {
      type: "WORKSPACE_SNAPSHOT";
      inboxEmpty: boolean;
      hasProjects: boolean;
      firstSessionId: Id<"sessions"> | null;
      firstProjectId: Id<"projects"> | null;
    }
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
  | { type: "TOP_APP_TARGET_SET"; target: TopAppTarget }
  | { type: "FILE_NOTE_BREADCRUMB_SOURCE_SET"; fromProjectNotesExplorer: boolean }
  /** User intents — orchestration owned by the machine (see appUiCommands). */
  | { type: "INTENT_WAKE_SIGMA_CLICK" }
  | { type: "INTENT_BREADCRUMB_PROJECT_CLICK" }
  | { type: "INTENT_BREADCRUMB_SESSION_CLICK" }
  | { type: "INTENT_BREADCRUMB_FILE_CLICK" }
  | { type: "INTENT_OPEN_NOTES_LIST" }
  | { type: "INTENT_RETURN_GRAPH_FROM_EDITOR" }
  | { type: "INTENT_SELECT_SESSION_FROM_SIDEBAR"; sessionId: Id<"sessions"> | null };
