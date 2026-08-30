import { useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import type { Id } from "../../convex/_generated/dataModel";
import type { WorkspaceFile } from "@/components/session-sidebar/workspaceTypes";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import {
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

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

function requestFocusComposer(): void {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
  });
}

/**
 * Navigation / sidebar / overlay intents — no draft coupling (safe for layout-only parents).
 */
export function useAppShellIntentHandlers(actor: AppUiActorRef) {
  const posthog = usePostHog();

  const setViewMode = useCallback(
    (mode: "graph" | "notesList") => {
      posthog.capture("view_mode_changed", { mode });
      if (mode === "notesList") {
        intentOpenNotesList(actor);
      } else {
        actor.send({ type: "VIEW_SET", mode: "graph" });
        requestFocusComposer();
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

  const handleWakeUpOverlayActionClick = useCallback(() => {
    intentOverlayActionClick(actor);
  }, [actor]);

  const onSelectSessionFromNotesList = useCallback(
    (file: WorkspaceFile) => {
      openSessionInFilesWithEditor(actor, file);
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
    handleWakeUpOverlayActionClick,
    onSelectSessionFromNotesList,
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
