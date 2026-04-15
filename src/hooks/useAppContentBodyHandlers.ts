import { useCallback } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import {
  intentBreadcrumbFileClick,
  intentBreadcrumbProjectClick,
  intentBreadcrumbSessionClick,
  intentOpenNotesList,
  intentSelectSessionFromSidebar,
  intentWakeSigmaClick,
  openSessionInFilesWithEditor,
  setActiveProject,
  setDraftInput,
} from "@/lib/appUiCommands";
import { toggleAtReferenceInDraft } from "@/lib/conceptReferences";

type UseAppContentBodyHandlersArgs = {
  actor: AppUiActorRef;
  draftInput: string;
};

/**
 * App shell intents — dispatch to XState via appUiCommands (no local orchestration).
 */
export function useAppContentBodyHandlers({
  actor,
  draftInput,
}: UseAppContentBodyHandlersArgs) {
  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      if (mode === "notesList") {
        intentOpenNotesList(actor);
      } else {
        actor.send({ type: "VIEW_SET", mode: "graph" });
      }
    },
    [actor],
  );

  const handleBreadcrumbProjectClick = useCallback(() => {
    intentBreadcrumbProjectClick(actor);
  }, [actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    intentBreadcrumbSessionClick(actor);
  }, [actor]);

  const handleBreadcrumbFileClick = useCallback(() => {
    intentBreadcrumbFileClick(actor);
  }, [actor]);

  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      setDraftInput(
        actor,
        toggleAtReferenceInDraft(draftInput, conceptNumber),
      );
      setTimeout(() => {
        document
          .querySelector<HTMLTextAreaElement>("[data-session-input-textarea]")
          ?.focus();
      }, 0);
    },
    [actor, draftInput],
  );

  const handleWakeUpSigmaClick = useCallback(() => {
    intentWakeSigmaClick(actor);
  }, [actor]);

  const onSelectSessionFromNotesList = useCallback(
    (session: Doc<"sessions">) => {
      openSessionInFilesWithEditor(actor, session);
    },
    [actor],
  );

  const onSelectSessionFromSidebar = useCallback(
    (id: Id<"sessions"> | null) => {
      intentSelectSessionFromSidebar(actor, id);
    },
    [actor],
  );

  const onSelectProjectFromSidebar = useCallback(
    (id: Id<"projects"> | null) => {
      setActiveProject(actor, id);
    },
    [actor],
  );

  return {
    setViewMode,
    handleBreadcrumbProjectClick,
    handleBreadcrumbSessionClick,
    handleBreadcrumbFileClick,
    handleCardReferenceClick,
    handleWakeUpSigmaClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  };
}
