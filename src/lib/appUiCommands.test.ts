import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { openSessionInFilesWithEditor } from "./appUiCommands";
import type { WorkspaceFile } from "@/components/session-sidebar/workspaceTypes";
import {
  appUiMachine,
  selectSurface,
} from "../machines/appUiMachine";
import { createActor } from "xstate";
import type { AppUiContext } from "../machines/appUiTypes";

const fileId = "file_1" as Id<"files">;
const sessionId = "sess_1" as Id<"sessions">;
const projectId = "proj_1" as Id<"projects">;

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

function mkFile(over: Partial<WorkspaceFile> = {}): WorkspaceFile {
  return {
    _id: fileId,
    _creationTime: 1,
    title: "LET THINK",
    createdAt: 1,
    sessionId,
    projectId,
    ...over,
  };
}

describe("openSessionInFilesWithEditor", () => {
  it("opens a file in the files editor with project drill", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSessionInFilesWithEditor(actor, mkFile());
    const ctx = actor.getSnapshot().context;
    expect(selectSurface(actor.getSnapshot())).toBe("notesList");
    expect(ctx.activeFileId).toBe(fileId);
    expect(ctx.activeSessionId).toBe(sessionId);
    expect(ctx.activeProjectId).toBe(projectId);
    expect(ctx.notesListDrill).toEqual({ type: "project", id: projectId });
    expect(ctx.editorOpen).toBe(true);
    actor.stop();
  });

  it("uses inbox drill when the file has no project", () => {
    const actor = createActor(appUiMachine, { input: baseInput() });
    actor.start();
    openSessionInFilesWithEditor(actor, mkFile({ projectId: undefined }));
    expect(actor.getSnapshot().context.notesListDrill).toEqual({
      type: "inbox",
    });
    actor.stop();
  });
});
