import { nextBatchIndexAfterLengthChange } from "../lib/batchIndexFromLengthChange";
import type { AppUiContext, AppUiEvent } from "./appUiTypes";

/** Pure merge for CHAT_HISTORY_META (sync facts + optional history panel policy). */
export function reduceChatHistoryMeta(
  context: AppUiContext,
  event: AppUiEvent,
): Partial<AppUiContext> {
  if (event.type !== "CHAT_HISTORY_META") return {};
  const next: Partial<AppUiContext> = {
    hasChatHistory: event.hasChatHistory,
    messagesLoading: event.messagesLoading,
  };
  const shouldCloseHistory =
    context.historyPanelOpen &&
    context.activeSessionId != null &&
    !event.messagesLoading &&
    !event.hasChatHistory;
  if (shouldCloseHistory) {
    return { ...next, historyPanelOpen: false };
  }
  return next;
}

/** Pure index + baseline update when batch count changes. */
export function reduceBatchesLengthChanged(
  context: AppUiContext,
  event: AppUiEvent,
): Partial<AppUiContext> {
  if (event.type !== "BATCHES_LENGTH_CHANGED") {
    return {};
  }
  const newLen = event.length;
  const selectedBatchIndex =
    newLen === 0
      ? context.selectedBatchIndex
      : nextBatchIndexAfterLengthChange({
          prevLength: context.prevBatchesLength,
          newLength: newLen,
          currentIndex: context.selectedBatchIndex,
        });
  const prevBatchesLength =
    event.length === 0 ? context.prevBatchesLength : event.length;
  return { selectedBatchIndex, prevBatchesLength };
}

/** Pure graph-loading state progression based on machine-owned loading fields. */
export function reduceGraphLoadingProgress(
  context: AppUiContext,
  event: AppUiEvent,
): Partial<AppUiContext> {
  if (event.type !== "GRAPH_LOADING_PROGRESS") return {};
  const latestBatchNodeCount = Math.max(0, event.latestBatchNodeCount);
  if (!context.chatLoading) {
    return {
      graphLatestBatchNodeCount: latestBatchNodeCount,
      graphShowLoadingCards: false,
      graphInteractionBlocked: false,
    };
  }
  const hasEnoughCards = latestBatchNodeCount >= context.graphLoadingCardSlots;
  return {
    graphLatestBatchNodeCount: latestBatchNodeCount,
    graphShowLoadingCards: !hasEnoughCards,
    graphInteractionBlocked: !hasEnoughCards,
  };
}
