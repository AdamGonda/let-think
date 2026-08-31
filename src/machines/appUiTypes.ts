import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../lib/notesListUtils";

export type SurfaceMode = "graph" | "notesList";

/** Concept cards, classic chat thread, or drawing canvas, while the session surface is open. */
export type SessionView = "graph" | "chat" | "canvas";

export type AppUiContext = {
  /** Workspace file (Files list). Ideation session is derived via file.sessionId. */
  activeFileId: Id<"files"> | null;
  /** Chat thread for the active file (many per file). */
  activeChatSessionId: Id<"chatSessions"> | null;
  /** Ideation/graph session for the active file. */
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  notesListDrill: NotesListDrill;
  selectedBatchIndex: number;
  /** Last seen batches.length from bridge (for clamp when length changes). */
  prevBatchesLength: number;
  draftInput: string;
  /** Independent composer draft for the chat lane. */
  chatDraftInput: string;
  notes: string;
  chatLoading: boolean;
  /** Chat-lane sends in flight, keyed so switching threads does not share loading UI. */
  chatThreadLoadingSessionIds: Array<Id<"chatSessions">>;
  /** Batches length snapshot captured when loading starts (machine-owned loading baseline). */
  graphLoadingStartBatchLength: number;
  /** Number of cards that must exist before graph interaction unlocks. */
  graphLoadingCardSlots: number;
  /** True while graph cards are in loading mode (skeleton/locked interaction). */
  graphShowLoadingCards: boolean;
  /** Interaction gate for concept cards while graph is still loading. */
  graphInteractionBlocked: boolean;
  /** Count of latest batch nodes currently available while chat is loading. */
  graphLatestBatchNodeCount: number;
  /** Machine-owned freeze gate for @n reference highlights during load->settle transitions. */
  graphReferenceFreezeActive: boolean;
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
  /** Mirrors `surface` parallel state for guards that only receive `context`. */
  surfaceMode: SurfaceMode;
  /** Graph cards, chat thread, or canvas (orthogonal to Files). */
  sessionView: SessionView;
  /** Monotonic token for sidebar collapse (legacy; no longer incremented on editor open). */
  sidebarCollapseRequestSeq: number;
  /** Monotonic token (legacy; brain / return-to-graph no longer bump it). */
  sidebarCollapseImmediateSeq: number;
};

export type AppUiEvent =
  | { type: "VIEW_SET"; mode: SurfaceMode }
  | { type: "SESSION_VIEW_SET"; view: SessionView }
  | { type: "CHAT_LOADING_START" }
  | { type: "CHAT_LOADING_END" }
  | { type: "CHAT_THREAD_LOADING_START"; chatSessionId: Id<"chatSessions"> }
  | { type: "CHAT_THREAD_LOADING_END"; chatSessionId: Id<"chatSessions"> }
  | { type: "CHAT_DRAFT_INPUT_SET"; value: string }
  | { type: "GRAPH_LOADING_PROGRESS"; latestBatchNodeCount: number }
  | { type: "CHAT_HISTORY_META"; hasChatHistory: boolean; messagesLoading: boolean }
  | { type: "BATCHES_LENGTH_CHANGED"; length: number }
  | {
      type: "WORKSPACE_SNAPSHOT";
      inboxEmpty: boolean;
      hasProjects: boolean;
      firstFileId: Id<"files"> | null;
      firstSessionId: Id<"sessions"> | null;
      firstProjectId: Id<"projects"> | null;
    }
  | { type: "EDITOR_OPEN" }
  | { type: "EDITOR_CLOSE" }
  | { type: "USER_EXIT_WAKE_UP" }
  | { type: "ACTIVE_FILE_SET"; fileId: Id<"files"> | null }
  | { type: "ACTIVE_CHAT_SESSION_SET"; chatSessionId: Id<"chatSessions"> | null }
  | { type: "ACTIVE_SESSION_SET"; sessionId: Id<"sessions"> | null }
  | { type: "ACTIVE_PROJECT_SET"; projectId: Id<"projects"> | null }
  | { type: "NOTES_LIST_DRILL_SET"; drill: NotesListDrill }
  | { type: "SELECTED_BATCH_INDEX_SET"; index: number }
  | { type: "DRAFT_INPUT_SET"; value: string }
  | { type: "NOTES_SET"; value: string }
  | { type: "HISTORY_OPEN" }
  | { type: "HISTORY_CLOSE" }
  /** User intents — orchestration owned by the machine (see appUiCommands). */
  | { type: "INTENT_OVERLAY_ACTION_CLICK" }
  | { type: "INTENT_BREADCRUMB_PROJECTS_ROOT_CLICK" }
  | { type: "INTENT_BREADCRUMB_SESSION_CLICK" }
  | { type: "INTENT_BREADCRUMB_FILE_CLICK" }
  | { type: "INTENT_OPEN_NOTES_LIST" }
  | { type: "INTENT_RETURN_GRAPH_FROM_EDITOR" }
  | {
      type: "INTENT_SELECT_SESSION_FROM_SIDEBAR";
      sessionId: Id<"sessions"> | null;
      fileId?: Id<"files"> | null;
    };
