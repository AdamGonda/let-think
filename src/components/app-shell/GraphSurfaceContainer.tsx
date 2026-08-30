import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { findSessionInWorkspace } from "../../lib/workspaceQueries";
import {
  intentOpenNotesList,
  openEditor,
  openHistoryPanel,
  setGraphLoadingProgress,
  setSelectedBatchIndex,
} from "@/lib/appUiCommands";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
type GraphSurfaceContainerProps = {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  onRunTutorial?: () => void;
};

/**
 * Concept graph + @n reference highlights — isolates graph machine fields from wake-up overlay state.
 */
export function GraphSurfaceContainer({
  workspace,
  activeSessionId,
  onRunTutorial,
}: GraphSurfaceContainerProps) {
  const posthog = usePostHog();
  const actor = useAppUiActor();
  const graph = useGraphSurfaceMachineSelectors();
  const { handleCardReferenceClick } = useGraphCardReferenceHandler({
    actor,
    draftInput: graph.draftInput,
  });

  const { conceptGraph, messages, batches } = useSessionData();

  const activeSessionInWorkspace = useMemo(
    () => findSessionInWorkspace(workspace, activeSessionId),
    [workspace, activeSessionId],
  );

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
      activeSessionTitle={activeSessionInWorkspace?.session.title}
      batchesLength={batches.length}
      selectedBatchIndex={graph.selectedBatchIndex}
      hasChatHistory={graph.hasChatHistory}
      chatLoading={graph.chatLoading}
      graphShowLoadingCards={graph.graphShowLoadingCards}
      graphInteractionBlocked={graph.graphInteractionBlocked}
      graphLoadingStartBatchLength={graph.graphLoadingStartBatchLength}
      conceptGraph={conceptGraph}
      chatVisible={chatComposerVisible}
      referencedConceptIds={referencedConceptIds}
      onSelectBatch={(i) => setSelectedBatchIndex(actor, i)}
      onHistoryOpen={() => {
        posthog.capture("chat_history_opened");
        openHistoryPanel(actor);
      }}
      onEditorOpen={handleEditorOpen}
      onOpenExplorer={() => intentOpenNotesList(actor)}
      onRunTutorial={onRunTutorial}
      onCardReferenceClick={
        isLatestBatch ? handleCardReferenceClick : undefined
      }
      onConceptCopy={isLatestBatch ? handleConceptCopy : undefined}
    />
  );
}
