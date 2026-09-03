import { describe, expect, it } from "vitest";
import {
  minDistanceThin,
  rdpThin,
  thinStrokePoints,
  type ThinablePoint,
} from "./thinStrokePoints";

function pts(
  coords: Array<[number, number] | [number, number, true]>,
): ThinablePoint[] {
  return coords.map(([x, y, gap]) => ({
    x,
    y,
    width: 2,
    ...(gap ? { gap: true as const } : {}),
  }));
}

describe("minDistanceThin", () => {
  it("keeps endpoints and drops near duplicates", () => {
    const input = pts([
      [0, 0],
      [0.1, 0],
      [0.2, 0],
      [10, 0],
    ]);
    const out = minDistanceThin(input, 1);
    expect(out[0]).toEqual(input[0]);
    expect(out[out.length - 1]).toEqual(input[input.length - 1]);
    expect(out.length).toBeLessThan(input.length);
  });

  it("always keeps gap markers", () => {
    const input = pts([
      [0, 0],
      [0.1, 0],
      [5, 0, true],
      [5.1, 0],
      [10, 0],
    ]);
    const out = minDistanceThin(input, 1);
    expect(out.some((p) => p.gap)).toBe(true);
  });
});

describe("rdpThin", () => {
  it("collapses a straight line to endpoints", () => {
    const input = pts([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    const out = rdpThin(input, 0.5);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(input[0]);
    expect(out[1]).toEqual(input[input.length - 1]);
  });

  it("keeps a corner point off the line", () => {
    const input = pts([
      [0, 0],
      [5, 0],
      [5, 5],
    ]);
    const out = rdpThin(input, 0.5);
    expect(out).toHaveLength(3);
  });
});

describe("thinStrokePoints", () => {
  it("reduces dense coalesced samples while keeping ends", () => {
    const input: ThinablePoint[] = [];
    for (let i = 0; i <= 100; i++) {
      input.push({ x: i * 0.1, y: Math.sin(i * 0.05) * 0.02, width: 2 });
    }
    const out = thinStrokePoints(input);
    expect(out.length).toBeLessThan(input.length);
    expect(out[0]).toEqual(input[0]);
    expect(out[out.length - 1]).toEqual(input[input.length - 1]);
  });

  it("returns short strokes unchanged", () => {
    const input = pts([[0, 0], [1, 1]]);
    expect(thinStrokePoints(input)).toEqual(input);
  });
});
