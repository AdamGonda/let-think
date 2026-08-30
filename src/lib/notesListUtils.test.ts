import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { projectGroupMatchesQuery } from "./notesListUtils";

function mkFile(id: string, title: string): ProjectWithSessions["files"][number] {
  return {
    _id: id as Id<"files">,
    _creationTime: 1,
    title,
    createdAt: 1,
    sessionId: `${id}-sess` as Id<"sessions">,
  };
}

describe("projectGroupMatchesQuery", () => {
  it("matches Inbox by name or by a file title inside it", () => {
    const inbox: ProjectWithSessions = {
      project: null,
      files: [mkFile("f1", "Loose note")],
    };
    expect(projectGroupMatchesQuery(inbox, "inbox")).toBe(true);
    expect(projectGroupMatchesQuery(inbox, "loose")).toBe(true);
    expect(projectGroupMatchesQuery(inbox, "zzz")).toBe(false);
  });
});
