import { useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import {
  intentBreadcrumbFileClick,
  intentBreadcrumbProjectsRootClick,
  intentBreadcrumbSessionClick,
  intentOpenNotesList,
  intentSelectSessionFromSidebar,
  intentOverlayActionClick,
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
  const posthog = usePostHog();

  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      posthog.capture("view_mode_changed", { mode });
      if (mode === "notesList") {
        intentOpenNotesList(actor);
      } else {
        actor.send({ type: "VIEW_SET", mode: "graph" });
      }
    },
    [actor, posthog],
  );

  const handleBreadcrumbProjectsRootClick = useCallback(() => {
    intentBreadcrumbProjectsRootClick(actor);
  }, [actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    intentBreadcrumbSessionClick(actor);
  }, [actor]);

  const handleBreadcrumbFileClick = useCallback(() => {
    intentBreadcrumbFileClick(actor);
  }, [actor]);

  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      const nextDraft = toggleAtReferenceInDraft(draftInput, conceptNumber);
      setDraftInput(
        actor,
        nextDraft,
      );
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>(
          "[data-session-input-textarea]",
        );
        if (!textarea) return;
        textarea.focus();
        const end = nextDraft.length;
        textarea.setSelectionRange(end, end);
      }, 0);
    },
    [actor, draftInput],
  );

  const handleWakeUpOverlayActionClick = useCallback(() => {
    intentOverlayActionClick(actor);
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
    handleBreadcrumbProjectsRootClick,
    handleBreadcrumbSessionClick,
    handleBreadcrumbFileClick,
    handleCardReferenceClick,
    handleWakeUpOverlayActionClick,
    onSelectSessionFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  };
}
