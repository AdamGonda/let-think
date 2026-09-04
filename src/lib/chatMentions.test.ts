import { describe, expect, it } from "vitest";
import {
  CANVAS_REF_ID,
  GRAPH_REF_ID,
  WRITING_REF_ID,
  type NumberedConcept,
} from "./conceptReferences";
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

  it("resolves @writing, @graph, and @canvas to display names", () => {
    const {
      resolvedContent,
      mentions,
      includeWriting,
      includeGraph,
      includeCanvas,
      includeFrameSlugs,
    } = resolveAtReferences("use @writing and @graph and @canvas", concepts);
    expect(resolvedContent).toBe("use Writing and Graph and Canvas");
    expect(includeWriting).toBe(true);
    expect(includeGraph).toBe(true);
    expect(includeCanvas).toBe(true);
    expect(includeFrameSlugs).toEqual([]);
    expect(mentions.map((m) => m.conceptId)).toEqual([
      WRITING_REF_ID,
      GRAPH_REF_ID,
      CANVAS_REF_ID,
    ]);
  });

  it("resolves canvas frame @slugs when frames are provided", () => {
    const frames = [{ id: "f1", name: "Eyes", slug: "eyes" }];
    const {
      resolvedContent,
      includeCanvas,
      includeFrameSlugs,
      mentions,
    } = resolveAtReferences("look at @eyes", concepts, frames);
    expect(resolvedContent).toBe("look at Eyes");
    expect(includeCanvas).toBe(false);
    expect(includeFrameSlugs).toEqual(["eyes"]);
    expect(mentions[0]?.conceptId).toBe("__frame__:eyes");
  });

  it("leaves unknown named @ tokens in place", () => {
    const { resolvedContent, includeWriting, includeFrameSlugs } =
      resolveAtReferences("see @foo", concepts);
    expect(resolvedContent).toBe("see @foo");
    expect(includeWriting).toBe(false);
    expect(includeFrameSlugs).toEqual([]);
  });
});

describe("parseInputTokens named refs", () => {
  it("styles @writing even with no numbered concepts", () => {
    expect(parseInputTokens("hi @writing", [])).toEqual([
      { type: "text", content: "hi " },
      { type: "token", content: "@writing", name: "Writing" },
    ]);
  });

  it("styles frame slugs when frames are known", () => {
    expect(
      parseInputTokens("hi @eyes", [], [{ id: "f1", name: "Eyes", slug: "eyes" }]),
    ).toEqual([
      { type: "text", content: "hi " },
      { type: "token", content: "@eyes", name: "Eyes" },
    ]);
  });
});
