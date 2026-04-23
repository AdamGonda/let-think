/**
 * App UI command layer — components call these instead of raw `actor.send` where possible.
 *
 * Event categories (see `AppUiEvent` in `appUiMachine`):
 * - **Bridge sync** — facts from Convex/session runtime (`CHAT_HISTORY_META`,
 *   `BATCHES_LENGTH_CHANGED`, `WORKSPACE_SNAPSHOT`). Only bridge/hooks.
 * - **User intent** — navigation and editing (`VIEW_SET`, `ACTIVE_SESSION_SET`, `EDITOR_OPEN`, …).
 *   Prefer these command functions from UI.
 */
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "../contexts/appUiActorContext";
import type { NotesListDrill } from "./notesListUtils";
import type { SurfaceMode } from "../machines/appUiTypes";

/**
 * Select session, project, and Files drill to match the session's project/inbox.
 */
export function setNotesListDrillForSession(
  actor: AppUiActorRef,
  session: Doc<"sessions">,
): void {
  actor.send({ type: "ACTIVE_SESSION_SET", sessionId: session._id });
  if (session.projectId) {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: session.projectId });
  } else {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
  }
  actor.send({
    type: "NOTES_LIST_DRILL_SET",
    drill: session.projectId
      ? { type: "project", id: session.projectId }
      : { type: "inbox" },
  });
}

/** Open session in Files list and focus the editor (notes overlay). */
export function openSessionInFilesWithEditor(
  actor: AppUiActorRef,
  session: Doc<"sessions">,
): void {
  actor.send({
    type: "FILE_NOTE_BREADCRUMB_SOURCE_SET",
    fromProjectNotesExplorer: true,
  });
  setNotesListDrillForSession(actor, session);
  actor.send({ type: "EDITOR_OPEN" });
}

/**
 * Breadcrumb: session is already active; only sync project + drill to the session's context.
 */
export function navigateDrillToSessionContext(
  actor: AppUiActorRef,
  projectId: Id<"projects"> | null,
): void {
  if (projectId) {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId });
    actor.send({
      type: "NOTES_LIST_DRILL_SET",
      drill: { type: "project", id: projectId },
    });
  } else {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
    actor.send({ type: "NOTES_LIST_DRILL_SET", drill: { type: "inbox" } });
  }
}

// --- User intent commands (UI entry points) ---

export function setViewMode(actor: AppUiActorRef, mode: SurfaceMode): void {
  actor.send({ type: "VIEW_SET", mode });
}

/** Open project notes list with drill synced from active project (XState intent). */
export function intentOpenNotesList(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
}

export function intentWakeSigmaClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_WAKE_SIGMA_CLICK" });
}

export function intentBreadcrumbProjectClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_BREADCRUMB_PROJECT_CLICK" });
}

export function intentBreadcrumbSessionClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_BREADCRUMB_SESSION_CLICK" });
}

export function intentBreadcrumbFileClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_BREADCRUMB_FILE_CLICK" });
}

export function intentReturnGraphFromEditor(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_RETURN_GRAPH_FROM_EDITOR" });
}

export function intentSelectSessionFromSidebar(
  actor: AppUiActorRef,
  sessionId: Id<"sessions"> | null,
): void {
  actor.send({ type: "INTENT_SELECT_SESSION_FROM_SIDEBAR", sessionId });
}

export function clearNotesListDrill(actor: AppUiActorRef): void {
  actor.send({ type: "NOTES_LIST_DRILL_SET", drill: null });
}

export function setNotesListDrill(actor: AppUiActorRef, drill: NotesListDrill): void {
  actor.send({ type: "NOTES_LIST_DRILL_SET", drill });
}

export function exitWakeUpOverlay(actor: AppUiActorRef): void {
  actor.send({ type: "USER_EXIT_WAKE_UP" });
}

export function closeEditor(actor: AppUiActorRef): void {
  actor.send({ type: "EDITOR_CLOSE" });
}

export function openEditor(actor: AppUiActorRef): void {
  actor.send({
    type: "FILE_NOTE_BREADCRUMB_SOURCE_SET",
    fromProjectNotesExplorer: false,
  });
  actor.send({ type: "EDITOR_OPEN" });
}

export function openHistoryPanel(actor: AppUiActorRef): void {
  actor.send({ type: "HISTORY_OPEN" });
}

export function closeHistoryPanel(actor: AppUiActorRef): void {
  actor.send({ type: "HISTORY_CLOSE" });
}

export function setSelectedBatchIndex(actor: AppUiActorRef, index: number): void {
  actor.send({ type: "SELECTED_BATCH_INDEX_SET", index });
}

export function setDraftInput(actor: AppUiActorRef, value: string): void {
  actor.send({ type: "DRAFT_INPUT_SET", value });
}

export function setWakeNotes(actor: AppUiActorRef, value: string): void {
  actor.send({ type: "NOTES_SET", value });
}

export function setChatLoading(actor: AppUiActorRef, loading: boolean): void {
  actor.send(
    loading ? { type: "CHAT_LOADING_START" } : { type: "CHAT_LOADING_END" },
  );
}

export function setGraphLoadingProgress(
  actor: AppUiActorRef,
  latestBatchNodeCount: number,
): void {
  actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount });
}

export function setActiveSession(
  actor: AppUiActorRef,
  sessionId: Id<"sessions"> | null,
): void {
  actor.send({
    type: "FILE_NOTE_BREADCRUMB_SOURCE_SET",
    fromProjectNotesExplorer: false,
  });
  actor.send({ type: "ACTIVE_SESSION_SET", sessionId });
}

export function setActiveProject(
  actor: AppUiActorRef,
  projectId: Id<"projects"> | null,
): void {
  actor.send({ type: "ACTIVE_PROJECT_SET", projectId });
}
