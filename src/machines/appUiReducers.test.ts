import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext } from "./appUiTypes";
import { reduceBatchesLengthChanged, reduceChatHistoryMeta } from "./appUiReducers";

function ctx(partial: Partial<AppUiContext>): AppUiContext {
  return {
    preference: "think",
    activeSessionId: null,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 2,
    prevBatchesLength: 3,
    draftInput: "",
    notes: "",
    chatLoading: false,
    inBreak: false,
    editorOpen: false,
    modelAwaitingDismissal: false,
    overlayDismissed: false,
    historyPanelOpen: false,
    hasChatHistory: true,
    messagesLoading: false,
    restWalkthroughDoneForStorage: false,
    restWalkthroughDismissed: false,
    hasEverHadSessionSelection: false,
    showFileNoteBreadcrumbFromProjectNotes: false,
    topAppTarget: "file" as const,
    surfaceMode: "graph" as const,
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
    ...partial,
  };
}

describe("reduceChatHistoryMeta", () => {
  it("returns empty for non-matching event", () => {
    expect(reduceChatHistoryMeta(ctx({}), { type: "PREFERENCE_TOGGLE" })).toEqual(
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
      reduceBatchesLengthChanged(ctx({}), { type: "PREFERENCE_TOGGLE" }),
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
