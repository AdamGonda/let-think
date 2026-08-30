import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { useSessionData } from "../../contexts/SessionDataContext";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppUiActor } from "../../hooks/useAppUi";
import { useGraphSurfaceMachineSelectors } from "../../hooks/useAppShellMachineSelectors";
import { useGraphCardReferenceHandler } from "../../hooks/useAppContentBodyHandlers";
import { AppContentGraphSurface } from "./AppContentGraphSurface";
import {
  buildNumberedConceptsFromGraph,
  formatConceptPlainForClipboard,
  referencedConceptIdsFromDraft,
} from "../../lib/conceptReferences";
import { userInputForBatch } from "../../lib/batchUserInput";
import { findFileInWorkspace } from "../../lib/workspaceQueries";
import {
  intentBreadcrumbProjectsRootClick,
  intentBreadcrumbSessionClick,
  openEditor,
  openHistoryPanel,
  setActiveChatSession,
  setGraphLoadingProgress,
  setSelectedBatchIndex,
  setSessionView,
} from "@/lib/appUiCommands";
import type { SessionView } from "@/machines/appUiTypes";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";
type GraphSurfaceContainerProps = {
  workspace: ProjectWithSessions[] | undefined;
  activeFileId: Id<"files"> | null;
  activeSessionId: Id<"sessions"> | null;
  activeChatSessionId: Id<"chatSessions"> | null;
  sessionPastFrame: boolean;
  graphComposer: ReactNode;
  chatComposer: ReactNode;
};

/**
 * Concept graph + @n reference highlights — isolates graph machine fields from wake-up overlay state.
 */
export function GraphSurfaceContainer({
  workspace,
  activeFileId,
  activeSessionId,
  activeChatSessionId,
  sessionPastFrame,
  graphComposer,
  chatComposer,
}: GraphSurfaceContainerProps) {
  const posthog = usePostHog();
  const actor = useAppUiActor();
  const createChatSession = useMutation(api.chatSessions.create);
  const graph = useGraphSurfaceMachineSelectors();
  const { handleCardReferenceClick } = useGraphCardReferenceHandler({
    actor,
    draftInput: graph.draftInput,
  });

  const { conceptGraph, messages, batches } = useSessionData();

  const activeFileInWorkspace = useMemo(
    () => findFileInWorkspace(workspace, activeFileId),
    [workspace, activeFileId],
  );
  const fileChats = useQuery(
    api.chatSessions.listByFile,
    activeFileId ? { fileId: activeFileId } : "skip",
  );

  useEffect(() => {
    if (!fileChats || fileChats.length === 0) return;
    if (
      activeChatSessionId &&
      fileChats.some((c) => c._id === activeChatSessionId)
    ) {
      return;
    }
    const first = fileChats[0];
    if (!first) return;
    setActiveChatSession(actor, first._id);
  }, [actor, fileChats, activeChatSessionId]);

  const numberedConcepts = useMemo(
    () =>
      buildNumberedConceptsFromGraph(
        conceptGraph,
        batches,
        graph.selectedBatchIndex,
      ),
    [conceptGraph, batches, graph.selectedBatchIndex],
  );

  const isLatestBatch =
    batches.length === 0 || graph.selectedBatchIndex === batches.length - 1;

  const batchUserPrompt = useMemo(
    () => userInputForBatch(batches, messages, graph.selectedBatchIndex),
    [batches, messages, graph.selectedBatchIndex],
  );

  const referenceSourceText = isLatestBatch ? graph.draftInput : batchUserPrompt;
  const liveReferencedConceptIds = useMemo(
    () => referencedConceptIdsFromDraft(referenceSourceText, numberedConcepts),
    [referenceSourceText, numberedConcepts],
  );

  const [frozenReferencedConceptIds, setFrozenReferencedConceptIds] = useState<
    Set<string>
  >(new Set());
  const [loadingLockedReferencedConceptIds, setLoadingLockedReferencedConceptIds] =
    useState<Set<string> | null>(null);
  const previousGraphReferenceFreezeActiveRef = useRef(false);

  /* Sync frozen @n highlights with graph reference freeze (same pattern as legacy AppContentBody). */
  /* eslint-disable react-hooks/set-state-in-effect -- intentional derived UI lock state */
  useEffect(() => {
    const wasFreezeActive = previousGraphReferenceFreezeActiveRef.current;
    if (graph.graphReferenceFreezeActive && !wasFreezeActive) {
      setFrozenReferencedConceptIds(new Set(liveReferencedConceptIds));
    }
    if (!graph.graphReferenceFreezeActive && wasFreezeActive) {
      setFrozenReferencedConceptIds(new Set());
    }
    previousGraphReferenceFreezeActiveRef.current = graph.graphReferenceFreezeActive;
  }, [graph.graphReferenceFreezeActive, liveReferencedConceptIds]);

  useEffect(() => {
    if (!graph.chatLoading) {
      setLoadingLockedReferencedConceptIds(null);
      return;
    }
    setLoadingLockedReferencedConceptIds((current) => {
      if (current != null) return current;
      return new Set(liveReferencedConceptIds);
    });
  }, [graph.chatLoading, liveReferencedConceptIds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!graph.chatLoading) {
      setGraphLoadingProgress(actor, 0);
      return;
    }
    const graphNodes = conceptGraph?.nodes ?? [];
    const graphNodeIdSet = new Set(graphNodes.map((n) => n.id));
    const canTrackProgress = batches.length > graph.graphLoadingStartBatchLength;
    if (!canTrackProgress) {
      setGraphLoadingProgress(actor, 0);
      return;
    }
    const latestBatch = batches[batches.length - 1];
    const latestBatchNodeCount =
      latestBatch?.nodeIds?.filter((id) => graphNodeIdSet.has(id)).length ?? 0;
    setGraphLoadingProgress(actor, latestBatchNodeCount);
  }, [
    actor,
    batches,
    graph.chatLoading,
    conceptGraph,
    graph.graphLoadingStartBatchLength,
  ]);

  const referencedConceptIds = useMemo(() => {
    if (loadingLockedReferencedConceptIds != null) {
      return loadingLockedReferencedConceptIds;
    }
    if (graph.graphReferenceFreezeActive) {
      return frozenReferencedConceptIds;
    }
    return liveReferencedConceptIds;
  }, [
    loadingLockedReferencedConceptIds,
    graph.graphReferenceFreezeActive,
    frozenReferencedConceptIds,
    liveReferencedConceptIds,
  ]);

  const handleEditorOpen = useCallback(() => {
    posthog.capture("editor_opened");
    openEditor(actor);
  }, [actor, posthog]);

  const handleSessionViewChange = useCallback(
    (view: SessionView) => {
      posthog.capture("session_view_changed", { view });
      setSessionView(actor, view);
      if (view === "chat") {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
        });
      }
    },
    [actor, posthog],
  );

  const handleNewChat = useCallback(async () => {
    if (!activeFileId) return;
    try {
      const id = await createChatSession({ fileId: activeFileId });
      posthog.capture("chat_session_created", { source: "chat_list" });
      setActiveChatSession(actor, id);
      window.dispatchEvent(new Event(FOCUS_COMPOSER_EVENT));
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create a new chat");
    }
  }, [activeFileId, actor, createChatSession, posthog]);

  const handleConceptCopy = useCallback(
    async (concept: { name: string; description?: string }) => {
      const text = formatConceptPlainForClipboard(concept);
      if (!text) {
        throw new Error("NO_CLIPBOARD_TEXT");
      }
      await navigator.clipboard.writeText(text);
      posthog.capture("concept_copied", { concept_name: concept.name });
      toast.success("Copied to clipboard");
    },
    [posthog],
  );

  const chatComposerVisible = true;

  return (
    <AppContentGraphSurface
      activeSessionId={activeSessionId}
      activeSessionTitle={activeFileInWorkspace?.file.title}
      activeProjectName={activeFileInWorkspace?.projectName}
      batchesLength={batches.length}
      selectedBatchIndex={graph.selectedBatchIndex}
      hasChatHistory={graph.hasChatHistory}
      chatLoading={graph.chatLoading}
      chatThreadLoading={graph.chatThreadLoading}
      graphShowLoadingCards={graph.graphShowLoadingCards}
      graphInteractionBlocked={graph.graphInteractionBlocked}
      graphLoadingStartBatchLength={graph.graphLoadingStartBatchLength}
      conceptGraph={conceptGraph}
      chatVisible={chatComposerVisible}
      sessionView={graph.sessionView}
      sessionPastFrame={sessionPastFrame}
      referencedConceptIds={referencedConceptIds}
      graphComposer={graphComposer}
      chatComposer={chatComposer}
      onSelectBatch={(i) => setSelectedBatchIndex(actor, i)}
      onSessionViewChange={handleSessionViewChange}
      onHistoryOpen={() => {
        posthog.capture("chat_history_opened");
        openHistoryPanel(actor);
      }}
      onEditorOpen={handleEditorOpen}
      onProjectsRootClick={() => intentBreadcrumbProjectsRootClick(actor)}
      onProjectNameClick={() => intentBreadcrumbSessionClick(actor)}
      fileChats={fileChats ?? []}
      activeChatSessionId={activeChatSessionId}
      onSelectChatSession={(id) => setActiveChatSession(actor, id)}
      onNewChat={() => {
        void handleNewChat();
      }}
      onCardReferenceClick={
        isLatestBatch ? handleCardReferenceClick : undefined
      }
      onConceptCopy={isLatestBatch ? handleConceptCopy : undefined}
    />
  );
}
