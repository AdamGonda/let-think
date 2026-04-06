/**
 * App UI command layer — components call these instead of raw `actor.send` where possible.
 *
 * Event categories (see `AppUiEvent` in `appUiMachine`):
 * - **Bridge sync** — facts from Convex/session runtime (`CHAT_HISTORY_META`, `BREAK_CHANGED`,
 *   `BATCHES_LENGTH_CHANGED`, `WORKSPACE_SNAPSHOT`, `REST_WALKTHROUGH_STORAGE_SYNC`). Only bridge/hooks.
 * - **User intent** — navigation and editing (`VIEW_SET`, `ACTIVE_SESSION_SET`, `EDITOR_OPEN`, …).
 *   Prefer these command functions from UI.
 */
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "../contexts/appUiActorContext";
import type { NotesListDrill } from "./notesListUtils";
import type { WorkPreferenceMode } from "./workPreferenceStorage";
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

export function notifyModelFinished(actor: AppUiActorRef): void {
  actor.send({ type: "MODEL_FINISHED" });
}

export function completeRestWalkthroughUi(actor: AppUiActorRef): void {
  actor.send({ type: "REST_WALKTHROUGH_COMPLETE" });
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

export function setWorkPreferenceMode(
  actor: AppUiActorRef,
  mode: WorkPreferenceMode,
): void {
  actor.send({ type: "PREFERENCE_SET", mode });
}
