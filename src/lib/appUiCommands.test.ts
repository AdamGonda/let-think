import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { openSearchHit } from "./appUiCommands";
import type { WorkspaceSearchHit } from "./searchHits";
import {
  appUiMachine,
  selectSurface,
} from "../machines/appUiMachine";
import type { AppUiContext } from "../machines/appUiTypes";

const fileId = "file_1" as Id<"files">;
const sessionId = "sess_1" as Id<"sessions">;
const projectId = "proj_1" as Id<"projects">;
const chatSessionId = "chat_1" as Id<"chatSessions">;

function baseInput(over: Partial<AppUiContext> = {}): Partial<AppUiContext> {
  return {
    activeFileId: null,
    activeChatSessionId: null,
    activeSessionId: null,
    activeProjectId: null,
    notesListDrill: null,
    selectedBatchIndex: 0,
    prevBatchesLength: 0,
    draftInput: "",
    chatDraftInput: "",
    notes: "",
    chatLoading: false,
    chatThreadLoadingSessionIds: [],
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
    surfaceMode: "notesList",
    sessionView: "graph",
    sidebarCollapseRequestSeq: 0,
    sidebarCollapseImmediateSeq: 0,
    ...over,
  };
}

function hit(over: Partial<WorkspaceSearchHit>): WorkspaceSearchHit {
  return {
    kind: "note",
    title: "LET THINK",
    snippet: "a remembered idea",
    fileId,
    sessionId,
    projectId,
    chatSessionId: null,
    nodeId: null,
    batchIndex: null,
    score: 0.9,
    reason: "contains",
    matchedTerms: [],
    ...over,
  };
}

describe("openSearchHit", () => {
  it("opens a note in the files editor", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSearchHit(actor, hit({ kind: "note" }));
    const ctx = actor.getSnapshot().context;
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(ctx.activeFileId).toBe(fileId);
    expect(ctx.activeSessionId).toBe(sessionId);
    expect(ctx.activeProjectId).toBe(projectId);
    expect(ctx.notesListDrill).toEqual({ type: "project", id: projectId });
    expect(ctx.editorOpen).toBe(true);
    actor.stop();
  });

  it("opens a chat thread on the graph surface", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSearchHit(
      actor,
      hit({ kind: "chat", chatSessionId }),
    );
    const ctx = actor.getSnapshot().context;
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    expect(ctx.sessionView).toBe("chat");
    expect(ctx.activeFileId).toBe(fileId);
    expect(ctx.activeSessionId).toBe(sessionId);
    expect(ctx.activeChatSessionId).toBe(chatSessionId);
    expect(ctx.editorOpen).toBe(false);
    actor.stop();
  });

  it("opens an idea on the matching graph batch", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSearchHit(
      actor,
      hit({ kind: "idea", nodeId: "n1", batchIndex: 2 }),
    );
    const ctx = actor.getSnapshot().context;
    expect(selectSurface(actor.getSnapshot())).toBe("graph");
    expect(ctx.sessionView).toBe("graph");
    expect(ctx.selectedBatchIndex).toBe(2);
    expect(ctx.editorOpen).toBe(false);
    actor.stop();
  });

  it("uses inbox drill when the file has no project", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSearchHit(actor, hit({ kind: "note", projectId: null }));
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "inbox",
    });
    actor.stop();
  });
});
