import { describe, expect, it } from "vitest";
import { caretEyeLevelScrollTop } from "./editorCaretScroll";

describe("caretEyeLevelScrollTop", () => {
  it("returns 0 when content fits", () => {
    expect(caretEyeLevelScrollTop(100, 800, 800)).toBe(0);
  });

  it("places the caret at one-third of the viewport", () => {
    const visibleHeight = 900;
    const scrollHeight = 3000;
    const caretOffset = 1200;
    expect(caretEyeLevelScrollTop(caretOffset, visibleHeight, scrollHeight)).toBe(
      caretOffset - visibleHeight / 3,
    );
  });

  it("clamps to the start and end of the scroll range", () => {
    expect(caretEyeLevelScrollTop(0, 800, 2400)).toBe(0);
    expect(caretEyeLevelScrollTop(4000, 800, 2400)).toBe(1600);
  });
});
