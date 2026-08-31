import { describe, expect, it } from "vitest";
import {
  searchHitReasonLabel,
  splitHighlightParts,
} from "./searchHits";

describe("searchHitReasonLabel", () => {
  it("names the matched words", () => {
    expect(searchHitReasonLabel("contains", ["artifact", "maschine"])).toBe(
      "Contains “artifact”, “maschine”",
    );
  });

  it("labels semantic neighbors", () => {
    expect(searchHitReasonLabel("similar", [])).toBe("Similar meaning");
  });
});

describe("splitHighlightParts", () => {
  it("marks query terms inside a snippet", () => {
    const parts = splitHighlightParts("The artifact maschine.", [
      "artifact",
      "maschine",
    ]);
    expect(parts.filter((p) => p.match).map((p) => p.text.toLowerCase())).toEqual(
      ["artifact", "maschine"],
    );
  });
});
