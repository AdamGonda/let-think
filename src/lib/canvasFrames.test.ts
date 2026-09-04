import { describe, expect, it } from "vitest";
import {
  isReservedFrameSlug,
  isValidFrameSlug,
  normalizeFrameRect,
  slugifyFrameName,
  validateFrameName,
} from "./canvasFrames";

describe("slugifyFrameName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyFrameName("  Sketch A  ")).toBe("sketch-a");
    expect(slugifyFrameName("Eyes!!")).toBe("eyes");
  });
});

describe("frame slug validation", () => {
  it("rejects reserved and digit-only tokens", () => {
    expect(isReservedFrameSlug("writing")).toBe(true);
    expect(isReservedFrameSlug("graph")).toBe(true);
    expect(isReservedFrameSlug("canvas")).toBe(true);
    expect(isReservedFrameSlug("12")).toBe(true);
    expect(isValidFrameSlug("eyes")).toBe(true);
    expect(isValidFrameSlug("1eyes")).toBe(false);
  });

  it("validateFrameName blocks duplicates and empty", () => {
    expect(validateFrameName("", [])).toBe("Name is required");
    expect(validateFrameName("canvas", [])).toBe("Name is reserved or invalid");
    expect(validateFrameName("Eyes", ["eyes"])).toBe("That name is already used");
    expect(validateFrameName("Eyes", ["eyes"], "eyes")).toBeNull();
    expect(validateFrameName("Sketch", [])).toBeNull();
  });
});

describe("normalizeFrameRect", () => {
  it("returns null when too small", () => {
    expect(normalizeFrameRect(0, 0, 3, 3)).toBeNull();
  });

  it("normalizes any drag direction", () => {
    expect(normalizeFrameRect(20, 30, 10, 10)).toEqual({
      x: 10,
      y: 10,
      w: 10,
      h: 20,
    });
  });
});
