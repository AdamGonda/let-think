import { createActor } from "xstate";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { timings } from "@/config";
import type { AppUiContext } from "./appUiTypes";
import {
  appUiMachine,
  focusLayerDemand,
  selectShowOverlaySigma,
  selectShowRestSessionWalkthrough,
  selectShowWakeUpOverlay,
  selectSurface,
  selectWorkSigmaEditorFromSession,
  sessionSelected,
} from "./appUiMachine";

const sid = "jd7abc123" as Id<"sessions">;

function baseInput(over: Partial<AppUiContext> = {}): Partial<AppUiContext> {
  return {
    preference: "think",
    activeSessionId: sid,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 0,
    prevBatchesLength: 0,
    draftInput: "",
    notes: "",
    chatLoading: false,
    inBreak: false,
    editorOpen: false,
    modelAwaitingDismissal: false,
    overlayDismissed: false,
    historyPanelOpen: false,
    hasChatHistory: false,
    messagesLoading: false,
    restWalkthroughDoneForStorage: false,
    restWalkthroughDismissed: false,
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

  it("work mode: demand true only for break or editor", () => {
    const c = fullCtx({
      preference: "work",
      chatLoading: true,
      editorOpen: false,
      inBreak: false,
    });
    expect(focusLayerDemand(c)).toBe(false);
    expect(focusLayerDemand({ ...c, editorOpen: true })).toBe(true);
    expect(focusLayerDemand({ ...c, inBreak: true, editorOpen: false })).toBe(true);
  });

  it("think mode: chatLoading implies demand", () => {
    expect(focusLayerDemand(fullCtx({ chatLoading: true }))).toBe(true);
  });
});

describe("selectShowRestSessionWalkthrough", () => {
  it("true when think session, not loading, no history, walkthrough not done/dismissed", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput(),
    });
    actor.start();
    expect(selectShowRestSessionWalkthrough(actor.getSnapshot())).toBe(true);
    actor.stop();
  });

  it("false when has chat history", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput(),
    });
    actor.start();
    actor.send({
      type: "CHAT_HISTORY_META",
      hasChatHistory: true,
      messagesLoading: false,
    });
    expect(selectShowRestSessionWalkthrough(actor.getSnapshot())).toBe(false);
    actor.stop();
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

  it("wake-up overlay when demand and session selected", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({ overlayDismissed: false }),
    });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });
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

  it("INTENT_WAKE_SIGMA_CLICK closes editor and bumps immediate collapse in work mode on graph", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        preference: "work",
        editorOpen: true,
        surfaceMode: "graph",
      }),
    });
    actor.start();
    expect(selectWorkSigmaEditorFromSession(actor.getSnapshot())).toBe(true);
    const imm = actor.getSnapshot().context.sidebarCollapseImmediateSeq;
    actor.send({ type: "INTENT_WAKE_SIGMA_CLICK" });
    expect(actor.getSnapshot().context.editorOpen).toBe(false);
    expect(actor.getSnapshot().context.sidebarCollapseImmediateSeq).toBe(imm + 1);
    actor.stop();
  });

  it("selectShowOverlaySigma matches think editor + notesList sigma rule", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput({
        preference: "think",
        editorOpen: true,
        inBreak: false,
        chatLoading: false,
      }),
    });
    actor.start();
    actor.send({ type: "VIEW_SET", mode: "notesList" });
    expect(selectShowOverlaySigma(actor.getSnapshot())).toBe(false);
    actor.send({ type: "VIEW_SET", mode: "graph" });
    expect(selectShowOverlaySigma(actor.getSnapshot())).toBe(true);
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
});
