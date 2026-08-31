import { describe, expect, it } from "vitest";
import {
  batchIdForNode,
  batchIndexForId,
  chatSourceKey,
  clipEmbeddingText,
  hashContent,
  ideaEmbeddingText,
  ideaSourceKey,
  isScheduledNoteEmbedCurrent,
  makeSnippet,
  matchingTerms,
  noteEmbeddingHash,
  noteSourceKey,
  queryTerms,
  removedIdeaNodeIds,
  SEARCH_EMBED_TEXT_MAX,
  shouldEnqueueEmbed,
  shouldKeepSearchHit,
  explainSearchHit,
} from "./searchDocuments";

describe("search document source keys", () => {
  it("is stable and unique per kind", () => {
    expect(noteSourceKey("file_1")).toBe("note:file_1");
    expect(chatSourceKey("msg_1")).toBe("chat:msg_1");
    expect(ideaSourceKey("sess_1", "node_1")).toBe("idea:sess_1:node_1");
    expect(noteSourceKey("file_1")).not.toBe(chatSourceKey("file_1"));
  });
});

describe("hashContent / snippet", () => {
  it("hashes stably and changes when text changes", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
    expect(hashContent("hello")).not.toBe(hashContent("hello!"));
  });

  it("clips snippet with an ellipsis", () => {
    expect(makeSnippet("short")).toBe("short");
    expect(makeSnippet("a".repeat(200)).endsWith("…")).toBe(true);
    expect(makeSnippet("  lots   of\nspace  ")).toBe("lots of space");
  });

  it("clips embedding text to the max", () => {
    const long = "x".repeat(SEARCH_EMBED_TEXT_MAX + 10);
    expect(clipEmbeddingText(long).length).toBe(SEARCH_EMBED_TEXT_MAX);
  });
});

describe("scheduled note embed current", () => {
  it("accepts the hash of the current notes", () => {
    expect(
      isScheduledNoteEmbedCurrent("hello notes", noteEmbeddingHash("hello notes")),
    ).toBe(true);
  });

  it("rejects a superseded snapshot", () => {
    expect(
      isScheduledNoteEmbedCurrent("hello notes!", noteEmbeddingHash("hello notes")),
    ).toBe(false);
  });
});

describe("shouldEnqueueEmbed", () => {
  const ready = {
    contentHash: "abc",
    embedding: new Array<number>(768).fill(0),
  };

  it("enqueues when there is no existing row", () => {
    expect(shouldEnqueueEmbed(null, "abc", false)).toBe(true);
  });

  it("skips when hash matches a ready vector", () => {
    expect(shouldEnqueueEmbed(ready, "abc", false)).toBe(false);
    expect(shouldEnqueueEmbed(ready, "abc", true)).toBe(false);
  });

  it("enqueues when content changed", () => {
    expect(shouldEnqueueEmbed(ready, "def", false)).toBe(true);
  });

  it("skips pending same-hash unless retryPending", () => {
    const pending = { contentHash: "abc", embedding: undefined };
    expect(shouldEnqueueEmbed(pending, "abc", false)).toBe(false);
    expect(shouldEnqueueEmbed(pending, "abc", true)).toBe(true);
  });
});

describe("idea embedding + batch lookup", () => {
  it("joins name and description", () => {
    expect(ideaEmbeddingText({ name: "Foo" })).toBe("Foo");
    expect(ideaEmbeddingText({ name: "Foo", description: "Bar" })).toBe(
      "Foo\nBar",
    );
  });

  it("picks the latest batch that contains the node", () => {
    const graph = {
      nodes: [{ id: "n1", name: "A" }],
      batches: [
        { id: "b0", nodeIds: ["n1"] },
        { id: "b1", nodeIds: ["n1", "n2"] },
      ],
    };
    expect(batchIdForNode(graph, "n1")).toBe("b1");
    expect(batchIdForNode(graph, "n2")).toBe("b1");
    expect(batchIdForNode(graph, "missing")).toBeUndefined();
    expect(batchIndexForId(graph.batches, "b0")).toBe(0);
    expect(batchIndexForId(graph.batches, "b1")).toBe(1);
    expect(batchIndexForId(graph.batches, "nope")).toBeNull();
  });

  it("lists removed idea node ids", () => {
    expect(removedIdeaNodeIds(["a", "b", "c"], new Set(["a", "c"]))).toEqual([
      "b",
    ]);
  });
});

describe("search hit explanation", () => {
  it("extracts content words from the query", () => {
    expect(queryTerms("The artifact maschine")).toEqual([
      "artifact",
      "maschine",
    ]);
  });

  it("finds overlapping terms in title or body", () => {
    expect(
      matchingTerms("The artifact maschine. You put an idea in.", [
        "artifact",
        "maschine",
      ]),
    ).toEqual(["artifact", "maschine"]);
    expect(
      matchingTerms("so many distractions. LET THINK app", [
        "artifact",
        "maschine",
      ]),
    ).toEqual([]);
  });

  it("keeps phrase matches even with a weak vector score", () => {
    expect(
      shouldKeepSearchHit({
        score: 0.2,
        matchedTerms: ["artifact"],
        bestScore: 0.9,
      }),
    ).toBe(true);
  });

  it("drops a distant semantic neighbor when a stronger hit exists", () => {
    expect(
      shouldKeepSearchHit({
        score: 0.4,
        matchedTerms: [],
        bestScore: 0.86,
      }),
    ).toBe(false);
  });

  it("labels contains vs similar", () => {
    const contains = explainSearchHit(
      "The artifact maschine",
      "The artifact maschine.",
      "You put an idea in and get a working thing out.",
    );
    expect(contains.reason).toBe("contains");
    expect(contains.matchedTerms).toEqual(["artifact", "maschine"]);
    const similar = explainSearchHit(
      "The artifact maschine",
      "Day 1",
      "The hard thing about this is there are so many disctractions.",
    );
    expect(similar.reason).toBe("similar");
    expect(similar.matchedTerms).toEqual([]);
  });
});
