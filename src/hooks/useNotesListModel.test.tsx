import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type {
  ProjectWithSessions,
  SessionWithPublish,
} from "@/components/session-sidebar/workspaceTypes";
import { useNotesListModel } from "./useNotesListModel";

function mkSession(
  id: string,
  title: string,
  createdAt: number,
  isPublished = false,
): SessionWithPublish {
  return {
    _id: id as Id<"sessions">,
    _creationTime: createdAt,
    title,
    createdAt,
    isPublished,
  };
}

function mkProject(id: string, name: string, createdAt: number): Doc<"projects"> {
  return {
    _id: id as Id<"projects">,
    _creationTime: createdAt,
    name,
    createdAt,
  };
}

describe("useNotesListModel", () => {
  it("counts total sessions and sorts by name", () => {
    const p1 = "p1" as Id<"projects">;
    const workspace: ProjectWithSessions[] = [
      { project: null, sessions: [mkSession("i1", "Inbox A", 100)] },
      {
        project: mkProject(p1, "Zebra", 1),
        sessions: [mkSession("s1", "Z1", 200)],
      },
    ];
    const onDrill = vi.fn();
    const { result } = renderHook(() =>
      useNotesListModel(workspace, null, onDrill, "all"),
    );
    expect(result.current.totalSessions).toBe(2);
    act(() => {
      result.current.setSortMode("name");
    });
    expect(result.current.sortedGroups[0]?.project).toBeNull();
    expect(result.current.sortedGroups[1]?.project?.name).toBe("Zebra");
  });

  it("filters groups by search query", () => {
    const p1 = "p1" as Id<"projects">;
    const workspace: ProjectWithSessions[] = [
      { project: null, sessions: [] },
      {
        project: mkProject(p1, "Alpha", 1),
        sessions: [],
      },
      {
        project: mkProject("p2" as Id<"projects">, "Beta", 1),
        sessions: [],
      },
    ];
    const onDrill = vi.fn();
    const { result } = renderHook(() =>
      useNotesListModel(workspace, null, onDrill, "all"),
    );
    act(() => {
      result.current.setSearchQuery("alp");
    });
    expect(result.current.filteredGroups).toHaveLength(1);
    expect(result.current.filteredGroups[0]?.project?.name).toBe("Alpha");
  });

  it("hides folders with no sessions matching publish filter", () => {
    const p1 = "p1" as Id<"projects">;
    const workspace: ProjectWithSessions[] = [
      {
        project: mkProject(p1, "OnlyPrivate", 1),
        sessions: [mkSession("s1", "A", 100, false)],
      },
      {
        project: mkProject("p2" as Id<"projects">, "HasPub", 2),
        sessions: [
          mkSession("s2", "B", 200, true),
          mkSession("s3", "C", 150, false),
        ],
      },
    ];
    const onDrill = vi.fn();
    const { result } = renderHook(() =>
      useNotesListModel(workspace, null, onDrill, "published"),
    );
    expect(result.current.filteredGroups).toHaveLength(1);
    expect(result.current.filteredGroups[0]?.project?.name).toBe("HasPub");
    expect(result.current.filteredGroups[0]?.sessions).toHaveLength(1);
    expect(result.current.filteredGroups[0]?.sessions[0]?._id).toBe("s2");
  });

  it("clears drill when group missing", async () => {
    const p1 = "p1" as Id<"projects">;
    const workspace: ProjectWithSessions[] = [
      {
        project: mkProject(p1, "P", 1),
        sessions: [mkSession("s1", "S", 10)],
      },
    ];
    const onDrill = vi.fn();
    const { rerender } = renderHook(
      ({ ws, drill }) => useNotesListModel(ws, drill, onDrill, "all"),
      {
        initialProps: {
          ws: workspace,
          drill: { type: "project" as const, id: p1 },
        },
      },
    );
    rerender({ ws: [], drill: { type: "project", id: p1 } });
    await waitFor(() => {
      expect(onDrill).toHaveBeenCalledWith(null);
    });
  });
});
