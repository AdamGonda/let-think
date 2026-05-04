import { useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import {
  intentBreadcrumbProjectsRootClick,
  intentBreadcrumbSessionClick,
  intentOpenDiscoverView,
  intentOpenFilesView,
  intentSelectSessionFromSidebar,
  intentOverlayActionClick,
  openSessionGraphFromNotesListDrill,
  openSessionInFilesWithEditor,
  setActiveProject,
  setDraftInput,
} from "@/lib/appUiCommands";
import { toggleAtReferenceInDraft } from "@/lib/conceptReferences";

/**
 * Navigation / sidebar / overlay intents — no draft coupling (safe for layout-only parents).
 */
export function useAppShellIntentHandlers(actor: AppUiActorRef) {
  const posthog = usePostHog();

  const openFilesView = useCallback(() => {
    posthog.capture("sidebar_files_open");
    intentOpenFilesView(actor);
  }, [actor, posthog]);

  const openDiscoverView = useCallback(() => {
    posthog.capture("sidebar_discover_open");
    intentOpenDiscoverView(actor);
  }, [actor, posthog]);

  const handleBreadcrumbProjectsRootClick = useCallback(() => {
    intentBreadcrumbProjectsRootClick(actor);
  }, [actor]);

  const handleBreadcrumbSessionClick = useCallback(() => {
    intentBreadcrumbSessionClick(actor);
  }, [actor]);

  const handleWakeUpOverlayActionClick = useCallback(() => {
    intentOverlayActionClick(actor);
  }, [actor]);

  const onSelectSessionFromNotesList = useCallback(
    (session: Doc<"sessions">) => {
      openSessionInFilesWithEditor(actor, session);
    },
    [actor],
  );

  const onGoToSessionGraphFromNotesList = useCallback(
    (session: Doc<"sessions">) => {
      openSessionGraphFromNotesListDrill(actor, session);
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
    openFilesView,
    openDiscoverView,
    handleBreadcrumbProjectsRootClick,
    handleBreadcrumbSessionClick,
    handleWakeUpOverlayActionClick,
    onSelectSessionFromNotesList,
    onGoToSessionGraphFromNotesList,
    onSelectSessionFromSidebar,
    onSelectProjectFromSidebar,
  };
}

type UseGraphCardReferenceHandlerArgs = {
  actor: AppUiActorRef;
  draftInput: string;
};

/** Graph @n reference toggles in chat draft — subscribe next to graph surface only. */
export function useGraphCardReferenceHandler({
  actor,
  draftInput,
}: UseGraphCardReferenceHandlerArgs) {
  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      const nextDraft = toggleAtReferenceInDraft(draftInput, conceptNumber);
      setDraftInput(actor, nextDraft);
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

  return { handleCardReferenceClick };
}

/** @deprecated Prefer useAppShellIntentHandlers + useGraphCardReferenceHandler */
export function useAppContentBodyHandlers({
  actor,
  draftInput,
}: UseGraphCardReferenceHandlerArgs & { actor: AppUiActorRef }) {
  const shell = useAppShellIntentHandlers(actor);
  const graph = useGraphCardReferenceHandler({ actor, draftInput });
  return { ...shell, ...graph };
}
