import { describe, expect, it } from "vitest";
import { projectSessionCentroidsTo2D } from "./sessionCentroidProjection";

describe("projectSessionCentroidsTo2D", () => {
  it("returns empty list when no points", () => {
    expect(projectSessionCentroidsTo2D([])).toEqual([]);
  });

  it("returns deterministic point for single centroid", () => {
    const result = projectSessionCentroidsTo2D([
      {
        sessionId: "s1",
        sessionTitle: "One",
        projectName: null,
        vector: [1, 2, 3],
        sourceNodeCount: 3,
      },
    ]);
    expect(result).toEqual([
      {
        sessionId: "s1",
        sessionTitle: "One",
        projectName: null,
        vector: [1, 2, 3],
        sourceNodeCount: 3,
        x: 0,
        y: 0,
      },
    ]);
  });

  it("returns deterministic result for same input", () => {
    const input = [
      {
        sessionId: "s1",
        sessionTitle: "One",
        projectName: "P",
        vector: [0.1, 0.2, 0.3, 0.4],
        sourceNodeCount: 4,
      },
      {
        sessionId: "s2",
        sessionTitle: "Two",
        projectName: "P",
        vector: [0.2, 0.25, 0.31, 0.35],
        sourceNodeCount: 5,
      },
      {
        sessionId: "s3",
        sessionTitle: "Three",
        projectName: null,
        vector: [0.9, 0.8, 0.7, 0.6],
        sourceNodeCount: 6,
      },
    ];
    const a = projectSessionCentroidsTo2D(input);
    const b = projectSessionCentroidsTo2D(input);
    expect(a).toEqual(b);
  });
});
