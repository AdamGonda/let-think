import { describe, expect, it } from "vitest";
import { buildMentionSegments } from "./chatHistoryMentionSegments";

describe("buildMentionSegments", () => {
  it("returns ellipsis-only when truncated and no mentions", () => {
    expect(buildMentionSegments("", undefined, 0, true)).toEqual([
      { type: "text", content: "…", name: "" },
    ]);
  });

  it("interleaves mention spans", () => {
    const display = "Hello world here";
    const segments = buildMentionSegments(
      display,
      [{ start: 0, end: 5, conceptId: "c", name: "Hello" }],
      display.length,
      false,
    );
    expect(segments.some((s) => s.type === "mention" && s.name === "Hello")).toBe(true);
  });
});
