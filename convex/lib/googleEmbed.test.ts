import { describe, expect, it } from "vitest";
import { fitEmbeddingDimensions, l2Normalize } from "./googleEmbed";

describe("l2Normalize", () => {
  it("scales a vector to unit length", () => {
    const n = l2Normalize([3, 4]);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.8);
  });
});

describe("fitEmbeddingDimensions", () => {
  it("passes through matching length", () => {
    expect(fitEmbeddingDimensions([1, 2], 2)).toEqual([1, 2]);
  });

  it("truncates and normalizes longer vectors", () => {
    const fitted = fitEmbeddingDimensions([3, 4, 5], 2);
    expect(fitted).toHaveLength(2);
    const mag = Math.sqrt((fitted[0] ?? 0) ** 2 + (fitted[1] ?? 0) ** 2);
    expect(mag).toBeCloseTo(1);
  });

  it("throws when the vector is too short", () => {
    expect(() => fitEmbeddingDimensions([1], 2)).toThrow(/smaller than required/);
  });
});
