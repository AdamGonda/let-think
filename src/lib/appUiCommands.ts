import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "../contexts/appUiActorContext";

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
