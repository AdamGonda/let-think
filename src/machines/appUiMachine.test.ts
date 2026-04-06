import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext } from "./appUiTypes";
import {
  appUiMachine,
  focusLayerDemand,
  selectShowRestSessionWalkthrough,
  selectShowWakeUpOverlay,
  selectSurface,
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
