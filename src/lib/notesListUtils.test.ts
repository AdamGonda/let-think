import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { projectGroupMatchesQuery } from "./notesListUtils";

function mkSession(id: string, title: string): Doc<"sessions"> {
  return {
    _id: id as Id<"sessions">,
    _creationTime: 1,
    title,
    createdAt: 1,
  };
}

describe("projectGroupMatchesQuery", () => {
  it("matches Inbox by name or by a file title inside it", () => {
    const inbox: ProjectWithSessions = {
      project: null,
      sessions: [mkSession("s1", "Loose note")],
    };
    expect(projectGroupMatchesQuery(inbox, "inbox")).toBe(true);
    expect(projectGroupMatchesQuery(inbox, "loose")).toBe(true);
    expect(projectGroupMatchesQuery(inbox, "zzz")).toBe(false);
  });
});
