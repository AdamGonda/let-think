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
    activeFileId: null,
    activeChatSessionId: null,
    activeSessionId: sid,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 0,
    prevBatchesLength: 0,
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
    hasChatHistory: false,
    messagesLoading: false,
    hasEverHadSessionSelection: true,
    surfaceMode: "graph",
    sessionView: "graph",
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
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
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.stop();
  });

  it("SESSION_VIEW_SET flips sessionView without changing surfaceMode", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ sessionView: "graph" }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    expect(actor.getSnapshot().context.sessionView).toBe("graph");
    actor.send({ type: "SESSION_VIEW_SET", view: "chat" });
    expect(actor.getSnapshot().context.sessionView).toBe("chat");
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    expect(actor.getSnapshot().context.surfaceMode).toBe("graph");
    actor.send({ type: "SESSION_VIEW_SET", view: "graph" });
    expect(actor.getSnapshot().context.sessionView).toBe("graph");
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.stop();
  });

  it("SESSION_VIEW_SET to chat closes the history panel", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ historyPanelOpen: true }),
    });
    actor.start();
    actor.send({ type: "HISTORY_OPEN" });
    expect(actor.getSnapshot().context.historyPanelOpen).toBe(true);
    actor.send({ type: "SESSION_VIEW_SET", view: "chat" });
    expect(actor.getSnapshot().context.historyPanelOpen).toBe(false);
    actor.stop();
  });

  it("CHAT_THREAD_LOADING does not start graph card skeletons", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "CHAT_THREAD_LOADING_START" });
    expect(actor.getSnapshot().context.chatThreadLoading).toBe(true);
    expect(actor.getSnapshot().context.chatLoading).toBe(false);
    expect(selectGraphShowLoadingCards(actor.getSnapshot())).toBe(false);
    actor.send({ type: "CHAT_THREAD_LOADING_END" });
    expect(actor.getSnapshot().context.chatThreadLoading).toBe(false);
    actor.stop();
  });

  it("graph and chat drafts are independent", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "DRAFT_INPUT_SET", value: "graph draft" });
    actor.send({ type: "CHAT_DRAFT_INPUT_SET", value: "chat draft" });
    expect(actor.getSnapshot().context.draftInput).toBe("graph draft");
    expect(actor.getSnapshot().context.chatDraftInput).toBe("chat draft");
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

  it("INTENT_OPEN_NOTES_LIST drills into inbox when active session has no project", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "inbox",
    });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.stop();
  });

  it("INTENT_OPEN_NOTES_LIST clears drill when no active session and no project", () => {
    const actor = createActor(
      appUiMachine,
      { input: baseInput({ activeSessionId: null, hasEverHadSessionSelection: false }) },
    );
    actor.start();
    actor.send({ type: "INTENT_OPEN_NOTES_LIST" });
    expect(actor.getSnapshot().context.notesListDrill).toBeNull();
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.stop();
  });

  it("INTENT_BREADCRUMB_SESSION_CLICK switches to Files surface when main view was graph", async () => {
    vi.useFakeTimers();
    const pid = "proj_xyz789" as Id<"projects">;
    const actor = createActor(appUiMachine, {
      input: baseInput({
        surfaceMode: "graph",
        editorOpen: true,
        activeProjectId: pid,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "INTENT_BREADCRUMB_SESSION_CLICK" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "project",
      id: pid,
    });
    await vi.advanceTimersByTimeAsync(timings.wakeUpExitMs + 1);
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    actor.stop();
    vi.useRealTimers();
  });

  it("INTENT_BREADCRUMB_SESSION_CLICK drills into Inbox when active session has no project", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, {
      input: baseInput({
        surfaceMode: "graph",
        editorOpen: true,
        activeProjectId: null,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "INTENT_BREADCRUMB_SESSION_CLICK" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "inbox",
    });
    expect(actor.getSnapshot().context.activeProjectId).toBeNull();
    await vi.advanceTimersByTimeAsync(timings.wakeUpExitMs + 1);
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    actor.stop();
    vi.useRealTimers();
  });

  it("INTENT_BREADCRUMB_PROJECTS_ROOT_CLICK exits overlay and clears drill when user has no projects", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, {
      input: baseInput({
        surfaceMode: "graph",
        editorOpen: true,
        activeProjectId: null,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "INTENT_BREADCRUMB_PROJECTS_ROOT_CLICK" });
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(actor.getSnapshot().context.notesListDrill).toBeNull();
    await vi.advanceTimersByTimeAsync(timings.wakeUpExitMs + 1);
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    actor.stop();
    vi.useRealTimers();
  });

  it("INTENT_OVERLAY_ACTION_CLICK closes editor without collapsing sidebar", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        editorOpen: true,
        surfaceMode: "graph",
      }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectOverlayActionReturnsToGraph(actor.getSnapshot())).toBe(true);
    const imm = actor.getSnapshot().context.sidebarCollapseImmediateSeq;
    actor.send({ type: "INTENT_OVERLAY_ACTION_CLICK" });
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    expect(actor.getSnapshot().context.sidebarCollapseImmediateSeq).toBe(imm);
    actor.stop();
  });

  it("selectShowOverlayAction: editor shows overlay control on Files surface and graph", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        editorOpen: true,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    expect(selectShowOverlayAction(actor.getSnapshot())).toBe(true);
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectShowOverlayAction(actor.getSnapshot())).toBe(true);
    actor.stop();
  });

  it("INTENT_BREADCRUMB_FILE_CLICK closes editor and exits explorer drill without sidebar collapse token", () => {
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
    expect(actor.getSnapshot().context.sidebarCollapseImmediateSeq).toBe(imm);
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

  it("EDITOR_OPEN does not bump sidebar collapse request (sidebar stays open)", async () => {
    vi.useFakeTimers();
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "EDITOR_OPEN" });
    expect(actor.getSnapshot().context.sidebarCollapseRequestSeq).toBe(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(actor.getSnapshot().context.sidebarCollapseRequestSeq).toBe(0);
    actor.stop();
    vi.useRealTimers();
  });

  it("INTENT_SELECT_SESSION_FROM_SIDEBAR opens the file editor and stays on notes list", () => {
    const other = "other_sess" as Id<"sessions">;
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    actor.send({ type: "INTENT_SELECT_SESSION_FROM_SIDEBAR", sessionId: other });
    expect(actor.getSnapshot().context.activeSessionId).toBe(other);
    expect(actor.getSnapshot().context.editorOpen).toBe(true);
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    actor.stop();
  });

  it("CHAT_LOADING_START keeps graph surface (does not bounce to explorer)", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.send({ type: "CHAT_LOADING_START" });
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    actor.send({ type: "CHAT_LOADING_END" });
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

  it("preserves prevBatchesLength when ACTIVE_SESSION_SET repeats the same session", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ prevBatchesLength: 5 }),
    });
    actor.start();
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: sid });
    expect(actor.getSnapshot().context.prevBatchesLength).toBe(5);
    actor.send({ type: "CHAT_LOADING_START" });
    expect(selectGraphLoadingStartBatchLength(actor.getSnapshot())).toBe(5);
    actor.stop();
  });

  it("zeros prevBatchesLength when switching ACTIVE_SESSION_SET to another session", () => {
    const other = "other_sess" as Id<"sessions">;
    const actor = createActor(appUiMachine, {
      input: baseInput({ prevBatchesLength: 7 }),
    });
    actor.start();
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: other });
    expect(actor.getSnapshot().context.activeSessionId).toBe(other);
    expect(actor.getSnapshot().context.prevBatchesLength).toBe(0);
    actor.stop();
  });

  it("clears in-flight chat loading when switching ACTIVE_SESSION_SET", () => {
    const other = "other_sess" as Id<"sessions">;
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
    actor.send({ type: "CHAT_THREAD_LOADING_START" });
    expect(actor.getSnapshot().context.chatLoading).toBe(true);
    expect(actor.getSnapshot().context.chatThreadLoading).toBe(true);
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: other });
    expect(actor.getSnapshot().context.chatLoading).toBe(false);
    expect(actor.getSnapshot().context.chatThreadLoading).toBe(false);
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

  it("WORKSPACE_SNAPSHOT auto-selects first file and session", () => {
    const fid = "file_first" as Id<"files">;
    const actor = createActor(appUiMachine, {
      input: baseInput({
        activeFileId: null,
        activeSessionId: null,
        hasEverHadSessionSelection: false,
      }),
    });
    actor.start();
    actor.send({
      type: "WORKSPACE_SNAPSHOT",
      inboxEmpty: false,
      hasProjects: false,
      firstFileId: fid,
      firstSessionId: sid,
      firstProjectId: null,
    });
    expect(actor.getSnapshot().context.activeFileId).toBe(fid);
    expect(actor.getSnapshot().context.activeSessionId).toBe(sid);
    actor.stop();
  });

  it("ACTIVE_FILE_SET to another file clears the chat session", () => {
    const fid = "file1" as Id<"files">;
    const fid2 = "file2" as Id<"files">;
    const cid = "chat1" as Id<"chatSessions">;
    const actor = createActor(appUiMachine, {
      input: baseInput({ activeFileId: fid, activeChatSessionId: cid }),
    });
    actor.start();
    actor.send({ type: "ACTIVE_FILE_SET", fileId: fid2 });
    expect(actor.getSnapshot().context.activeFileId).toBe(fid2);
    expect(actor.getSnapshot().context.activeChatSessionId).toBeNull();
    actor.stop();
  });

  it("ACTIVE_FILE_SET hydrate from null keeps stored chat session", () => {
    const fid = "file1" as Id<"files">;
    const cid = "chat1" as Id<"chatSessions">;
    const actor = createActor(appUiMachine, {
      input: baseInput({
        activeFileId: null,
        activeChatSessionId: cid,
      }),
    });
    actor.start();
    actor.send({ type: "ACTIVE_FILE_SET", fileId: fid });
    expect(actor.getSnapshot().context.activeChatSessionId).toBe(cid);
    actor.stop();
  });
});
