import { describe, expect, it } from "vitest";
import type { NumberedConcept } from "./conceptReferences";
import { parseInputTokens, resolveAtReferences } from "./chatMentions";

const concepts: NumberedConcept[] = [
  { id: "a", name: "Alpha", number: 1 },
  { id: "b", name: "Beta", number: 2 },
];

describe("parseInputTokens", () => {
  it("split text and token segments", () => {
    const segs = parseInputTokens("hi @1 there", concepts);
    expect(segs).toEqual([
      { type: "text", content: "hi " },
      { type: "token", content: "@1", name: "Alpha" },
      { type: "text", content: " there" },
    ]);
  });
});

describe("resolveAtReferences", () => {
  it("replaces @n with concept names and records mentions", () => {
    const { resolvedContent, mentions, referencedConcepts } = resolveAtReferences(
      "see @1",
      concepts,
    );
    expect(resolvedContent).toBe("see Alpha");
    expect(mentions).toHaveLength(1);
    expect(mentions[0]!.conceptId).toBe("a");
    expect(referencedConcepts.map((c) => c.id)).toEqual(["a"]);
  });

  it("leaves unknown @n in place", () => {
    const { resolvedContent } = resolveAtReferences("see @9", concepts);
    expect(resolvedContent).toBe("see @9");
  });
});
