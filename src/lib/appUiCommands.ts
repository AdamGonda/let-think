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

/**
 * Select session, project, and Files drill to match the session's project/inbox.
 */
function setNotesListDrillForSession(
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
  setNotesListDrillForSession(actor, session);
  actor.send({ type: "EDITOR_OPEN" });
}

// --- User intent commands (UI entry points) ---

/** Open project notes list with drill synced from active project (XState intent). */
export function intentOpenNotesList(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
}

export function intentOverlayActionClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_OVERLAY_ACTION_CLICK" });
}

/** Open Files at the Projects root (all projects), then exit the notes overlay. */
export function intentBreadcrumbProjectsRootClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_BREADCRUMB_PROJECTS_ROOT_CLICK" });
}

export function intentBreadcrumbSessionClick(actor: AppUiActorRef): void {
  actor.send({ type: "INTENT_BREADCRUMB_SESSION_CLICK" });
}

export function intentSelectSessionFromSidebar(
  actor: AppUiActorRef,
  sessionId: Id<"sessions"> | null,
): void {
  actor.send({ type: "INTENT_SELECT_SESSION_FROM_SIDEBAR", sessionId });
}

/**
 * From Files (project/inbox drill): open the session on the graph/chat surface, close the
 * notes overlay if it was open, and align the active project with the session for the sidebar.
 */
export function openSessionGraphFromNotesListDrill(
  actor: AppUiActorRef,
  session: Doc<"sessions">,
): void {
  if (session.projectId) {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: session.projectId });
  } else {
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
  }
  intentSelectSessionFromSidebar(actor, session._id);
  actor.send({ type: "EDITOR_CLOSE" });
}

export function setNotesListDrill(actor: AppUiActorRef, drill: NotesListDrill): void {
  actor.send({ type: "NOTES_LIST_DRILL_SET", drill });
}

export function openEditor(actor: AppUiActorRef): void {
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
  actor.send({ type: "ACTIVE_SESSION_SET", sessionId });
}

export function setActiveProject(
  actor: AppUiActorRef,
  projectId: Id<"projects"> | null,
): void {
  actor.send({ type: "ACTIVE_PROJECT_SET", projectId });
}
