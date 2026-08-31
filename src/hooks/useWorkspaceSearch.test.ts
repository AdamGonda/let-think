import { describe, expect, it } from "vitest";
import { workspaceSearchView } from "./useWorkspaceSearch";

describe("workspaceSearchView", () => {
  it("is idle below the minimum length", () => {
    expect(workspaceSearchView("a", 2, "artifact")).toBe("idle");
    expect(workspaceSearchView("", 2, "artifact")).toBe("idle");
  });

  it("loads when the cache does not belong to this query", () => {
    expect(workspaceSearchView("artifact maschine", 2, null)).toBe("loading");
    expect(workspaceSearchView("artifact maschine", 2, "other")).toBe(
      "loading",
    );
  });

  it("reuses cache only for the same query", () => {
    expect(workspaceSearchView("artifact maschine", 2, "artifact maschine")).toBe(
      "cached",
    );
  });
});
