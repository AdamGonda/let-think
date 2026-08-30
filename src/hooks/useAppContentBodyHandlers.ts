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
  setChatDraftInput,
  setDraftInput,
} from "@/lib/appUiCommands";
import {
  mirrorAtReferencePresence,
  removeAtReferencesFromDraft,
  toggleAtReferenceInDraft,
} from "@/lib/conceptReferences";

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

/** Graph card @n toggle — graph draft first, then mirror that ref onto the chat draft. */
export function useGraphCardReferenceHandler({
  actor,
  draftInput,
}: UseGraphCardReferenceHandlerArgs) {
  const handleCardReferenceClick = useCallback(
    (conceptNumber: number) => {
      const nextDraft = toggleAtReferenceInDraft(draftInput, conceptNumber);
      setDraftInput(actor, nextDraft);
      const chatDraft = actor.getSnapshot().context.chatDraftInput;
      const nextChat = mirrorAtReferencePresence(
        nextDraft,
        chatDraft,
        conceptNumber,
      );
      if (nextChat !== chatDraft) {
        setChatDraftInput(actor, nextChat);
      }
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

/** After chat send, drop those `@n` from the graph draft so cards unselect. */
export function clearGraphDraftReferences(
  actor: AppUiActorRef,
  conceptNumbers: number[],
): void {
  if (conceptNumbers.length === 0) return;
  const graphDraft = actor.getSnapshot().context.draftInput;
  const next = removeAtReferencesFromDraft(graphDraft, conceptNumbers);
  if (next !== graphDraft) setDraftInput(actor, next);
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
