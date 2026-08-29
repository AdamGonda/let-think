import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext } from "../machines/appUiTypes";
import { appUiMachine } from "../machines/appUiMachine";
import {
  selectGraphSurfaceMachineModel,
  selectWakeUpOverlayModel,
} from "./useAppShellMachineSelectors";

const sid = "jd7abc123" as Id<"sessions">;

function baseInput(over: Partial<AppUiContext> = {}): Partial<AppUiContext> {
  return {
    activeSessionId: sid,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 0,
    prevBatchesLength: 1,
    draftInput: "",
    notes: "overlay-notes",
    graphLoadingCardSlots: 6,
    editorOpen: true,
    editorChatOpen: false,
    notesChatLoading: false,
    overlayDismissed: false,
    historyPanelOpen: false,
    hasChatHistory: false,
    messagesLoading: false,
    hasEverHadSessionSelection: true,
    surfaceMode: "graph",
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
    ...over,
  };
}

describe("selector isolation (editor / graph)", () => {
  it("GRAPH_LOADING_PROGRESS changes graph surface model but preserves wake overlay fields", () => {
    const actor = createActor(appUiMachine, {
      input: baseInput(),
    });
    actor.start();
    actor.send({ type: "CHAT_LOADING_START" });

    const wakeBefore = selectWakeUpOverlayModel(actor.getSnapshot());
    const graphBefore = selectGraphSurfaceMachineModel(actor.getSnapshot());

    actor.send({ type: "GRAPH_LOADING_PROGRESS", latestBatchNodeCount: 4 });

    const wakeAfter = selectWakeUpOverlayModel(actor.getSnapshot());
    const graphAfter = selectGraphSurfaceMachineModel(actor.getSnapshot());

    expect(wakeAfter).toEqual(wakeBefore);
    expect(wakeAfter.notes).toBe("overlay-notes");
    expect(graphAfter).not.toEqual(graphBefore);
    expect(graphBefore.graphInteractionBlocked).toBe(true);
    expect(graphAfter.graphInteractionBlocked).toBe(false);
  });
});
