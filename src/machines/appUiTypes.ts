import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../lib/notesListUtils";

export type SurfaceMode = "graph" | "notesList";

/**
 * Top-level mode for the Files / Explore view.
 * "mine" = user's own projects + sessions (with drill behavior).
 * "discover" = global feed of published notes from all users.
 */
export type NotesListMode = "mine" | "discover";

/** Mine list: filter project cards and drill sessions by Discover publish state. */
export type NotesListPublishFilter = "all" | "published" | "private";

/** Data shown in the publish / unpublish confirmation dialog (parallel `publishConfirm` region). */
export type PublishConfirmDraft =
  | null
  | {
      sessionId: Id<"sessions">;
      intent: "publish" | "unpublish";
      sessionTitle: string;
    };

export type AppUiContext = {
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  notesListDrill: NotesListDrill;
  notesListMode: NotesListMode;
  notesListPublishFilter: NotesListPublishFilter;
  /**
   * Discover: read-only published note viewer. Null when closed.
   * Owned by the machine — open/close via `PUBLISHED_NOTE_VIEWER_*` events.
   */
  publishedNoteViewerSessionId: Id<"sessions"> | null;
  publishConfirmDraft: PublishConfirmDraft;
  /** Last Convex / network error while confirming (cleared on new open). */
  publishConfirmError: string | null;
  selectedBatchIndex: number;
  /** Last seen batches.length from bridge (for clamp when length changes). */
  prevBatchesLength: number;
  draftInput: string;
  notes: string;
  chatLoading: boolean;
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
  /** Monotonic token for sidebar collapse (legacy; no longer incremented on editor open). */
  sidebarCollapseRequestSeq: number;
  /** Monotonic token (legacy; brain / return-to-graph no longer bump it). */
  sidebarCollapseImmediateSeq: number;
};

export type AppUiEvent =
  | { type: "VIEW_SET"; mode: SurfaceMode }
  | { type: "CHAT_LOADING_START" }
  | { type: "CHAT_LOADING_END" }
  | { type: "GRAPH_LOADING_PROGRESS"; latestBatchNodeCount: number }
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
  | { type: "NOTES_LIST_MODE_SET"; mode: NotesListMode }
  | { type: "NOTES_LIST_PUBLISH_FILTER_SET"; filter: NotesListPublishFilter }
  | { type: "PUBLISHED_NOTE_VIEWER_OPEN"; sessionId: Id<"sessions"> }
  | { type: "PUBLISHED_NOTE_VIEWER_CLOSE" }
  | {
      type: "PUBLISH_CONFIRM_OPEN";
      sessionId: Id<"sessions">;
      intent: "publish" | "unpublish";
      sessionTitle: string;
    }
  | { type: "PUBLISH_CONFIRM_CANCEL" }
  | { type: "PUBLISH_CONFIRM_SUBMIT" }
  /** Close publish confirm without saving (navigation, stacking modals, etc.). */
  | { type: "PUBLISH_CONFIRM_DISMISS" }
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
  | { type: "INTENT_SELECT_SESSION_FROM_SIDEBAR"; sessionId: Id<"sessions"> | null };
