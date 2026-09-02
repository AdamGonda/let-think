import { beforeEach, describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import {
  getStoredAppUiSelection,
  setStoredAppUiSelection,
  type StoredAppUiSelection,
} from "./appUiStorage";

const fid = "jd7file123" as Id<"files">;
const sid = "jd7sess123" as Id<"sessions">;
const cid = "jd7chat123" as Id<"chatSessions">;
const pid = "jd7proj123" as Id<"projects">;

function fullSelection(
  over: Partial<StoredAppUiSelection> = {},
): StoredAppUiSelection {
  return {
    activeFileId: fid,
    activeChatSessionId: cid,
    activeSessionId: sid,
    activeProjectId: pid,
    hasEverHadSessionSelection: true,
    sessionView: "canvas",
    surfaceMode: "graph",
    notesListDrill: { type: "project", id: pid },
    editorOpen: true,
    selectedBatchIndex: 2,
    prevBatchesLength: 5,
    ...over,
  };
}

describe("appUiStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(getStoredAppUiSelection()).toEqual({
      activeFileId: null,
      activeChatSessionId: null,
      activeSessionId: null,
      activeProjectId: null,
      hasEverHadSessionSelection: false,
      sessionView: "graph",
      surfaceMode: "notesList",
      notesListDrill: null,
      editorOpen: false,
      selectedBatchIndex: 0,
      prevBatchesLength: 0,
    });
  });

  it("round-trips full navigation selection", () => {
    const value = fullSelection();
    setStoredAppUiSelection(value);
    expect(getStoredAppUiSelection()).toEqual(value);
  });

  it("round-trips inbox drill and notesList surface", () => {
    const value = fullSelection({
      surfaceMode: "notesList",
      notesListDrill: { type: "inbox" },
      sessionView: "graph",
      editorOpen: false,
      selectedBatchIndex: 0,
      prevBatchesLength: 0,
    });
    setStoredAppUiSelection(value);
    expect(getStoredAppUiSelection()).toEqual(value);
  });

  it("falls back on corrupted nav fields", () => {
    setStoredAppUiSelection(fullSelection());
    localStorage.setItem("think-surface-mode", "nope");
    localStorage.setItem("think-notes-list-drill", "{not-json");
    localStorage.setItem("think-session-view", "wat");
    localStorage.setItem("think-selected-batch-index", "-1");
    localStorage.setItem("think-prev-batches-length", "1.5");
    localStorage.setItem("think-editor-open", "yes");

    expect(getStoredAppUiSelection()).toMatchObject({
      surfaceMode: "notesList",
      notesListDrill: null,
      sessionView: "graph",
      selectedBatchIndex: 0,
      prevBatchesLength: 0,
      editorOpen: false,
    });
  });

  it("treats null drill JSON as null", () => {
    setStoredAppUiSelection(fullSelection({ notesListDrill: null }));
    expect(getStoredAppUiSelection().notesListDrill).toBeNull();
  });
});
