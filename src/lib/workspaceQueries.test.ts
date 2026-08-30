import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import {
  buildWorkspaceSnapshot,
  findFileBySessionId,
  findFileInWorkspace,
  firstFileByRecency,
  flattenFilesSorted,
  listFilesInWorkspace,
} from "./workspaceQueries";

function file(
  id: string,
  createdAt: number,
  sessionId: string,
  projectId?: Id<"projects">,
): ProjectWithSessions["files"][number] {
  return {
    _id: id as Id<"files">,
    _creationTime: createdAt,
    title: "t",
    createdAt,
    projectId,
    sessionId: sessionId as Id<"sessions">,
  };
}

function project(id: string, name: string, createdAt: number): Doc<"projects"> {
  return {
    _id: id as Id<"projects">,
    _creationTime: createdAt,
    name,
    createdAt,
  };
}

describe("flattenFilesSorted / firstFileByRecency", () => {
  it("sorts files newest first", () => {
    const ws: ProjectWithSessions[] = [
      {
        project: null,
        files: [file("a", 100, "sa"), file("b", 300, "sb")],
      },
      {
        project: project("p1", "P", 50),
        files: [file("c", 200, "sc", "p1" as Id<"projects">)],
      },
    ];
    const flat = flattenFilesSorted(ws);
    expect(flat.map((s) => s._id)).toEqual(["b", "c", "a"]);
    expect(firstFileByRecency(ws)?._id).toBe("b");
  });
});

describe("buildWorkspaceSnapshot", () => {
  it("returns null for undefined workspace", () => {
    expect(buildWorkspaceSnapshot(undefined)).toBeNull();
  });

  it("detects empty inbox and first file project", () => {
    const pid = "proj1" as Id<"projects">;
    const ws: ProjectWithSessions[] = [
      { project: null, files: [] },
      {
        project: project("proj1", "P", 10),
        files: [file("f1", 500, "s1", pid)],
      },
    ];
    const snap = buildWorkspaceSnapshot(ws);
    expect(snap).toEqual({
      inboxEmpty: true,
      hasProjects: true,
      firstFileId: "f1" as Id<"files">,
      firstSessionId: "s1" as Id<"sessions">,
      firstProjectId: pid,
    });
  });
});

describe("findFileInWorkspace / findFileBySessionId", () => {
  it("returns undefined when missing", () => {
    expect(findFileInWorkspace(undefined, "x" as Id<"files">)).toBeUndefined();
    expect(findFileBySessionId(undefined, "x" as Id<"sessions">)).toBeUndefined();
  });

  it("finds file with project label", () => {
    const pid = "proj1" as Id<"projects">;
    const fid = "file1" as Id<"files">;
    const sid = "sess1" as Id<"sessions">;
    const ws: ProjectWithSessions[] = [
      {
        project: project("proj1", "Alpha", 1),
        files: [file(fid, 2, sid, pid)],
      },
    ];
    const found = findFileInWorkspace(ws, fid);
    expect(found?.projectName).toBe("Alpha");
    expect(found?.projectId).toBe(pid);
    expect(findFileBySessionId(ws, sid)?.file._id).toBe(fid);
  });
});

describe("listFilesInWorkspace", () => {
  it("flattens groups newest first with folder labels", () => {
    const pid = "p1" as Id<"projects">;
    const ws: ProjectWithSessions[] = [
      {
        project: null,
        files: [file("a", 100, "sa"), file("b", 300, "sb")],
      },
      {
        project: project("p1", "YouTube", 50),
        files: [file("c", 200, "sc", pid)],
      },
    ];
    const rows = listFilesInWorkspace(ws);
    expect(rows.map((r) => r.file._id)).toEqual(["b", "c", "a"]);
    expect(rows[0]?.projectName).toBe("Inbox");
    expect(rows[1]?.projectName).toBe("YouTube");
    expect(listFilesInWorkspace(undefined)).toEqual([]);
  });
});
