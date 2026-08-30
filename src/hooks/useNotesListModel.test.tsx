import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { useNotesListModel } from "./useNotesListModel";

function mkSession(
  id: string,
  title: string,
  createdAt: number,
): Doc<"sessions"> {
  return {
    _id: id as Id<"sessions">,
    _creationTime: createdAt,
    title,
    createdAt,
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
  it("keeps Inbox first and sorts project folders by recent activity", () => {
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
      useNotesListModel(workspace, null, onDrill),
    );
    expect(result.current.totalSessions).toBe(2);
    expect(result.current.sortedGroups[0]?.project).toBeNull();
    expect(result.current.sortedGroups[1]?.project?.name).toBe("Zebra");
    expect(result.current.rootFolders).toHaveLength(1);
    expect(result.current.rootFiles).toHaveLength(1);
    expect(result.current.rootFiles[0]?.title).toBe("Inbox A");
  });

  it("treats workspace as empty only when there are no files and no folders", () => {
    const onDrill = vi.fn();
    const { result, rerender } = renderHook(
      ({ ws }) => useNotesListModel(ws, null, onDrill),
      {
        initialProps: {
          ws: [
            { project: null, sessions: [] },
          ] as ProjectWithSessions[],
        },
      },
    );
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.hasProjects).toBe(false);

    rerender({
      ws: [
        { project: null, sessions: [] },
        {
          project: mkProject("p1", "Solo", 1),
          sessions: [],
        },
      ],
    });
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasProjects).toBe(true);
    expect(result.current.rootFolders).toHaveLength(1);
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
      useNotesListModel(workspace, null, onDrill),
    );
    act(() => {
      result.current.setSearchQuery("alp");
    });
    expect(result.current.filteredGroups).toHaveLength(1);
    expect(result.current.filteredGroups[0]?.project?.name).toBe("Alpha");
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
      ({ ws, drill }) => useNotesListModel(ws, drill, onDrill),
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
