import { describe, expect, it } from "vitest";
import { editorScrollThumbLayout } from "./MarkdownEditor";

describe("editorScrollThumbLayout", () => {
  it("returns null when content fits", () => {
    expect(editorScrollThumbLayout(800, 800, 0)).toBeNull();
  });

  it("pins the thumb to the top and bottom of the track", () => {
    const clientHeight = 800;
    const scrollHeight = 2400;
    const atTop = editorScrollThumbLayout(clientHeight, scrollHeight, 0);
    const atBottom = editorScrollThumbLayout(
      clientHeight,
      scrollHeight,
      scrollHeight - clientHeight,
    );
    expect(atTop).not.toBeNull();
    expect(atBottom).not.toBeNull();
    expect(atTop?.top).toBe(0);
    expect(atBottom?.top).toBe(clientHeight - atBottom!.height);
    expect(atTop?.height).toBeCloseTo((800 / 2400) * 800);
  });
});
