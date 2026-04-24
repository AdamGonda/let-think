import { createActor } from "xstate";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { timings } from "@/config";
import type { AppUiContext } from "./appUiTypes";
import {
  appUiMachine,
  focusLayerDemand,
  selectGraphInteractionBlocked,
  selectGraphLoadingStartBatchLength,
  selectGraphReferenceFreezeActive,
  selectGraphShowLoadingCards,
  selectShowOverlayAction,
  selectShowWakeUpOverlay,
  selectOverlayActionReturnsToGraph,
  selectSurface,
  sessionSelected,
} from "./appUiMachine";

const sid = "jd7abc123" as Id<"sessions">;

function baseInput(over: Partial<AppUiContext> = {}): Partial<AppUiContext> {
  return {
    activeSessionId: sid,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 0,
    prevBatchesLength: 0,
    draftInput: "",
    notes: "",
    chatLoading: false,
    graphLoadingStartBatchLength: 0,
    graphLoadingCardSlots: 6,
    graphShowLoadingCards: false,
    graphInteractionBlocked: false,
    graphLatestBatchNodeCount: 0,
    graphReferenceFreezeActive: false,
    editorOpen: false,
    overlayDismissed: false,
    historyPanelOpen: false,
    hasChatHistory: false,
    messagesLoading: false,
    hasEverHadSessionSelection: true,
    surfaceMode: "graph",
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
    showFileNoteBreadcrumbFromProjectNotes: false,
    ...over,
  };
}

function fullCtx(over: Partial<AppUiContext> = {}): AppUiContext {
  return { ...baseInput(), ...over } as AppUiContext;
}

describe("sessionSelected / focusLayerDemand", () => {
  it("sessionSelected is false when no active session", () => {
    expect(sessionSelected(fullCtx({ activeSessionId: null }))).toBe(false);
  });

  it("demand true only when editor open", () => {
    const c = fullCtx({
      chatLoading: true,
      editorOpen: false,
    });
    expect(focusLayerDemand(c)).toBe(false);
    expect(focusLayerDemand({ ...c, editorOpen: true })).toBe(true);
  });
});

describe("selectors from running actor", () => {
  it("VIEW_SET switches surface", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.stop();
  });

  it("wake-up overlay when editor demand and session selected", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ overlayDismissed: false }),
    });
    actor.start();
    actor.send({ type: "EDITOR_OPEN" });
    expect(selectShowWakeUpOverlay(actor.getSnapshot())).toBe(true);
    actor.stop();
  });
});

describe("intent orchestration", () => {
  it("INTENT_OPEN_NOTES_LIST sets drill from active project and switches surface", () => {
    const pid = "proj_xyz789" as Id<"projects">;
    const actor = createActor(appUiMachine, {
      input: baseInput({ activeProjectId: pid }),
    });
    actor.start();
    actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "project",
      id: pid,
    });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(actor.getSnapshot().context.surfaceMode).toBe("notesList");
    actor.stop();
  });

  it("INTENT_OPEN_NOTES_LIST clears drill when no active project", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
    expect(actor.getSnapshot().context.notesListDrill).toBeNull();
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.stop();
  });

  it("INTENT_OVERLAY_ACTION_CLICK closes editor and bumps immediate collapse on graph", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        editorOpen: true,
        surfaceMode: "graph",
      }),
    });
    actor.start();
    expect(selectOverlayActionReturnsToGraph(actor.getSnapshot())).toBe(true);
    const imm = actor.getSnapshot().context.sidebarCollapseImmediateSeq;
    actor.send({ type: "INTENT_OVERLAY_ACTION_CLICK" });
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    expect(actor.getSnapshot().context.sidebarCollapseImmediateSeq).toBe(imm + 1);
    actor.stop();
  });

  it("selectShowOverlayAction: editor on notesList hides action; on graph shows", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        editorOpen: true,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    expect(selectShowOverlayAction(actor.getSnapshot())).toBe(false);
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectShowOverlayAction(actor.getSnapshot())).toBe(true);
    actor.stop();
  });

  it("INTENT_BREADCRUMB_FILE_CLICK closes editor, exits explorer drill, bumps immediate collapse seq", () => {
    const pid = "proj_xyz789" as Id<"projects">;
    const actor = createActor(appUiMachine, {
      input: baseInput({
        editorOpen: true,
        surfaceMode: "notesList",
        notesListDrill: { type: "project", id: pid },
      }),
    });
    actor.start();
    const imm = actor.getSnapshot().context.sidebarCollapseImmediateSeq;
    actor.send({ type: "INTENT_BREADCRUMB_FILE_CLICK" });
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    expect(actor.getSnapshot().context.sidebarCollapseImmediateSeq).toBe(imm + 1);
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    expect(actor.getSnapshot().context.notesListDrill).toBeNull();
    actor.stop();
  });

  it("EDITOR_OPEN keeps notes list surface + drill (explorer stays behind overlay)", () => {
    const pid = "proj_xyz789" as Id<"projects">;
    const actor = createActor(appUiMachine, {
      input: baseInput({
        surfaceMode: "notesList",
        notesListDrill: { type: "project", id: pid },
      }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    actor.send({ type: "EDITOR_OPEN" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "project",
      id: pid,
    });
    expect(actor.getSnapshot().context.editorOpen).toBe(true);
    actor.stop();
  });

  it("EDITOR_OPEN defers sidebar collapse request until after delay", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "EDITOR_OPEN" });
    expect(actor.getSnapshot().context.sidebarCollapseRequestSeq).toBe(0);
    await vi.advanceTimersByTimeAsync(timings.sidebarCollapseAfterEditorOpenMs);
    expect(actor.getSnapshot().context.sidebarCollapseRequestSeq).toBe(1);
    actor.stop();
    vi.useRealTimers();
  });

  it("EDITOR_CLOSE before delay cancels deferred sidebar collapse request", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "EDITOR_OPEN" });
    await vi.advanceTimersByTimeAsync(100);
    actor.send({ type: "EDITOR_CLOSE" });
    await vi.advanceTimersByTimeAsync(timings.sidebarCollapseAfterEditorOpenMs);
    expect(actor.getSnapshot().context.sidebarCollapseRequestSeq).toBe(0);
    actor.stop();
    vi.useRealTimers();
  });

  it("file overlay breadcrumb flag clears when selecting session from sidebar", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        showFileNoteBreadcrumbFromProjectNotes: true,
      }),
    });
    actor.start();
    actor.send({
      type: "INTENT_SELECT_SESSION_FROM_SIDEBAR",
      sessionId: "other_sess" as Id<"sessions">,
    });
    expect(actor.getSnapshot().context.showFileNoteBreadcrumbFromProjectNotes).toBe(
      false,
    );
    actor.stop();
  });

  it("INTENT_SELECT_SESSION_FROM_SIDEBAR switches to graph when on notes list", () => {
    const other = "other_sess" as Id<"sessions">;
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    actor.send({ type: "INTENT_SELECT_SESSION_FROM_SIDEBAR", sessionId: other });
    expect(actor.getSnapshot().context.activeSessionId).toBe(other);
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.stop();
  });

  it("captures graph loading baseline and blocks interaction on loading start", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ prevBatchesLength: 3 }),
    });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
    expect(selectGraphLoadingStartBatchLength(actor.getSnapshot())).toBe(3);
    expect(selectGraphShowLoadingCards(actor.getSnapshot())).toBe(true);
    expect(selectGraphInteractionBlocked(actor.getSnapshot())).toBe(true);
    actor.stop();
  });

  it("unblocks graph interaction as soon as first card appears", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
    actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 0 });
    expect(selectGraphInteractionBlocked(actor.getSnapshot())).toBe(true);
    actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 1 });
    expect(selectGraphShowLoadingCards(actor.getSnapshot())).toBe(true);
    expect(selectGraphInteractionBlocked(actor.getSnapshot())).toBe(false);
    actor.stop();
  });

  it("cleans graph loading state on loading end and inactive session", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
    actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 4 });
    actor.send({ type: "CHAT_LOADING_END" });
    expect(selectGraphShowLoadingCards(actor.getSnapshot())).toBe(false);
    expect(selectGraphInteractionBlocked(actor.getSnapshot())).toBe(false);
    expect(selectGraphLoadingStartBatchLength(actor.getSnapshot())).toBe(0);
    actor.send({ type: "CHAT_LOADING_START" });
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: null });
    expect(selectGraphShowLoadingCards(actor.getSnapshot())).toBe(false);
    expect(selectGraphInteractionBlocked(actor.getSnapshot())).toBe(false);
    actor.stop();
  });

  it("keeps reference freeze active through stabilization window", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
    expect(selectGraphReferenceFreezeActive(actor.getSnapshot())).toBe(true);
    actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 6 });
    expect(selectGraphReferenceFreezeActive(actor.getSnapshot())).toBe(true);
    await vi.advanceTimersByTimeAsync(timings.graphReferenceStabilizeMs - 1);
    expect(selectGraphReferenceFreezeActive(actor.getSnapshot())).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(selectGraphReferenceFreezeActive(actor.getSnapshot())).toBe(false);
    actor.stop();
    vi.useRealTimers();
  });
});
