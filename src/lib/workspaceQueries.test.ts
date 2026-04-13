import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import {
  buildWorkspaceSnapshot,
  findSessionInWorkspace,
  firstSessionByRecency,
  flattenSessionsSorted,
} from "./workspaceQueries";

function session(
  id: string,
  createdAt: number,
  projectId?: Id<"projects">,
): Doc<"sessions"> {
  return {
    _id: id as Id<"sessions">,
    _creationTime: createdAt,
    title: "t",
    createdAt,
    projectId,
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

describe("flattenSessionsSorted / firstSessionByRecency", () => {
  it("sorts sessions newest first", () => {
    const ws: ProjectWithSessions[] = [
      {
        project: null,
        sessions: [session("a", 100), session("b", 300)],
      },
      {
        project: project("p1", "P", 50),
        sessions: [session("c", 200, "p1" as Id<"projects">)],
      },
    ];
    const flat = flattenSessionsSorted(ws);
    expect(flat.map((s) => s._id)).toEqual(["b", "c", "a"]);
    expect(firstSessionByRecency(ws)?._id).toBe("b");
  });
});

describe("buildWorkspaceSnapshot", () => {
  it("returns null for undefined workspace", () => {
    expect(buildWorkspaceSnapshot(undefined)).toBeNull();
  });

  it("detects empty inbox and first session project", () => {
    const pid = "proj1" as Id<"projects">;
    const ws: ProjectWithSessions[] = [
      { project: null, sessions: [] },
      {
        project: project("proj1", "P", 10),
        sessions: [session("s1", 500, pid)],
      },
    ];
    const snap = buildWorkspaceSnapshot(ws);
    expect(snap).toEqual({
      inboxEmpty: true,
      hasProjects: true,
      firstSessionId: "s1" as Id<"sessions">,
      firstProjectId: pid,
    });
  });
});

describe("findSessionInWorkspace", () => {
  it("returns undefined when missing", () => {
    expect(findSessionInWorkspace(undefined, "x" as Id<"sessions">)).toBeUndefined();
  });

  it("finds session with project label", () => {
    const pid = "proj1" as Id<"projects">;
    const sid = "sess1" as Id<"sessions">;
    const ws: ProjectWithSessions[] = [
      {
        project: project("proj1", "Alpha", 1),
        sessions: [session(sid, 2, pid)],
      },
    ];
    const found = findSessionInWorkspace(ws, sid);
    expect(found?.projectName).toBe("Alpha");
    expect(found?.projectId).toBe(pid);
  });
});
