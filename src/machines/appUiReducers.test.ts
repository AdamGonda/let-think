import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext } from "./appUiTypes";
import {
  reduceBatchesLengthChanged,
  reduceChatHistoryMeta,
  reduceGraphLoadingProgress,
} from "./appUiReducers";

function ctx(partial: Partial<AppUiContext>): AppUiContext {
  return {
    activeSessionId: null,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 2,
    prevBatchesLength: 3,
    draftInput: "",
    chatDraftInput: "",
    notes: "",
    chatLoading: false,
    chatThreadLoading: false,
    graphLoadingStartBatchLength: 0,
    graphLoadingCardSlots: 6,
    graphShowLoadingCards: false,
    graphInteractionBlocked: false,
    graphLatestBatchNodeCount: 0,
    graphReferenceFreezeActive: false,
    editorOpen: false,
    overlayDismissed: false,
    historyPanelOpen: false,
    hasChatHistory: true,
    messagesLoading: false,
    hasEverHadSessionSelection: false,
    surfaceMode: "graph" as const,
    sessionView: "graph" as const,
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
    ...partial,
  };
}

describe("reduceChatHistoryMeta", () => {
  it("returns empty for non-matching event", () => {
    expect(reduceChatHistoryMeta(ctx({}), { type: "VIEW_SET", mode: "graph" })).toEqual(
      {},
    );
  });

  it("merges meta and keeps history open when history exists", () => {
    const out = reduceChatHistoryMeta(ctx({ historyPanelOpen: true }), {
      type: "CHAT_HISTORY_META",
      hasChatHistory: true,
      messagesLoading: false,
    });
    expect(out).toEqual({
      hasChatHistory: true,
      messagesLoading: false,
    });
  });

  it("closes history when session active, panel open, done loading, no history", () => {
    const out = reduceChatHistoryMeta(
      ctx({
        activeSessionId: "jd7abc123" as Id<"sessions">,
        historyPanelOpen: true,
      }),
      {
        type: "CHAT_HISTORY_META",
        hasChatHistory: false,
        messagesLoading: false,
      },
    );
    expect(out).toEqual({
      hasChatHistory: false,
      messagesLoading: false,
      historyPanelOpen: false,
    });
  });
});

describe("reduceBatchesLengthChanged", () => {
  it("returns empty for wrong event type", () => {
    expect(
      reduceBatchesLengthChanged(ctx({}), { type: "VIEW_SET", mode: "graph" }),
    ).toEqual({});
  });

  it("updates index and prev length when batches exist", () => {
    const out = reduceBatchesLengthChanged(
      ctx({ selectedBatchIndex: 1, prevBatchesLength: 2 }),
      { type: "BATCHES_LENGTH_CHANGED", length: 4 },
    );
    expect(out.selectedBatchIndex).toBe(3);
    expect(out.prevBatchesLength).toBe(4);
  });

  it("preserves selected index when length becomes 0", () => {
    const out = reduceBatchesLengthChanged(
      ctx({ selectedBatchIndex: 2, prevBatchesLength: 2 }),
      { type: "BATCHES_LENGTH_CHANGED", length: 0 },
    );
    expect(out.selectedBatchIndex).toBe(2);
    expect(out.prevBatchesLength).toBe(2);
  });
});

describe("reduceGraphLoadingProgress", () => {
  it("returns empty for wrong event type", () => {
    expect(
      reduceGraphLoadingProgress(ctx({}), { type: "VIEW_SET", mode: "graph" }),
    ).toEqual({});
  });

  it("keeps loading mode and blocks interactions while no cards are loaded", () => {
    const out = reduceGraphLoadingProgress(
      ctx({
        chatLoading: true,
        graphLoadingCardSlots: 6,
        graphShowLoadingCards: true,
        graphInteractionBlocked: true,
      }),
      { type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 0 },
    );
    expect(out).toEqual({
      graphLatestBatchNodeCount: 0,
      graphShowLoadingCards: true,
      graphInteractionBlocked: true,
    });
  });

  it("unlocks interactions as soon as any card is loaded", () => {
    const out = reduceGraphLoadingProgress(
      ctx({
        chatLoading: true,
        graphLoadingCardSlots: 6,
        graphShowLoadingCards: true,
        graphInteractionBlocked: true,
      }),
      { type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 1 },
    );
    expect(out).toEqual({
      graphLatestBatchNodeCount: 1,
      graphShowLoadingCards: true,
      graphInteractionBlocked: false,
    });
  });
});
