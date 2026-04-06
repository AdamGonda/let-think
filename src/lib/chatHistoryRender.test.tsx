import { describe, expect, it } from "vitest";
import { truncateAtWord } from "./chatHistoryRender";

describe("truncateAtWord", () => {
  it("returns short content unchanged", () => {
    expect(truncateAtWord("abc", 10)).toBe("abc");
  });

  it("truncates at last space when reasonable", () => {
    const long = "one two three four five six";
    const out = truncateAtWord(long, 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out.endsWith("three") || out.includes(" ")).toBe(true);
  });
});
