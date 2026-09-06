import { describe, expect, it } from "vitest";
import { resolveSidecarText, skipEmptyOverwrite } from "./editorSidecars";

describe("resolveSidecarText", () => {
  it("prefers sidecar draft, including empty, over leftover session.draftInput", () => {
    expect(resolveSidecarText("typed", "old session draft")).toBe("typed");
    expect(resolveSidecarText("", "old session draft")).toBe("");
    expect(resolveSidecarText(undefined, "old session draft")).toBe(
      "old session draft",
    );
    expect(resolveSidecarText(undefined, undefined)).toBe("");
  });

  it("prefers sidecar notes over file and session leftovers", () => {
    expect(resolveSidecarText("sidecar", "file notes", "session notes")).toBe(
      "sidecar",
    );
    expect(resolveSidecarText(undefined, "file notes", "session notes")).toBe(
      "file notes",
    );
    expect(resolveSidecarText(undefined, undefined, "session notes")).toBe(
      "session notes",
    );
  });
});

describe("skipEmptyOverwrite", () => {
  it("blocks empty writes over stored text", () => {
    expect(skipEmptyOverwrite("", "kept")).toBe(true);
    expect(skipEmptyOverwrite("kept", "kept")).toBe(false);
    expect(skipEmptyOverwrite("edit", "kept")).toBe(false);
    expect(skipEmptyOverwrite("", "")).toBe(false);
  });
});

/** Mirrors `projects.listWithSessions` toWorkspaceFile — list docs stay lean. */
function toWorkspaceFile(file: {
  _id: string;
  _creationTime: number;
  title: string;
  createdAt: number;
  projectId?: string;
  thinkingNotes?: string;
  userId?: string;
}, sessionId: string | null) {
  return {
    _id: file._id,
    _creationTime: file._creationTime,
    title: file.title,
    createdAt: file.createdAt,
    ...(file.projectId !== undefined ? { projectId: file.projectId } : {}),
    sessionId,
  };
}

describe("workspace list shape", () => {
  it("omits notes, drafts, and userId from listed files", () => {
    const listed = toWorkspaceFile(
      {
        _id: "file1",
        _creationTime: 1,
        title: "Idea",
        createdAt: 1,
        projectId: "p1",
        thinkingNotes: "secret notes",
        userId: "u1",
      },
      "session1",
    );
    expect(listed).toEqual({
      _id: "file1",
      _creationTime: 1,
      title: "Idea",
      createdAt: 1,
      projectId: "p1",
      sessionId: "session1",
    });
    expect(listed).not.toHaveProperty("thinkingNotes");
    expect(listed).not.toHaveProperty("draftInput");
    expect(listed).not.toHaveProperty("userId");
  });
});
