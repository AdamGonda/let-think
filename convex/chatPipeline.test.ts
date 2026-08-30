import { describe, expect, it } from "vitest";
import {
  buildConceptGraphPromptWindow,
  extractConceptGraph,
  preProcess,
  stripConceptGraphBlock,
  conversationTableForSend,
  buildReferencedConceptsSystemNote,
} from "./chatPipeline";
import { CONCEPT_GRAPH_PROMPT_BATCH_WINDOW } from "./constants";

describe("extractConceptGraph", () => {
  it("parses last json code block with nodes and edges", () => {
    const text = `Hello

\`\`\`json
{"nodes":[{"id":"1","name":"A","description":"d"}],"edges":[{"source":"1","target":"1"}]}
\`\`\`
`;
    const g = extractConceptGraph(text);
    expect(g?.nodes).toHaveLength(1);
    expect(g?.nodes[0]?.name).toBe("A");
    expect(g?.edges).toHaveLength(1);
  });

  it("returns null when no graph block", () => {
    expect(extractConceptGraph("no code block")).toBeNull();
  });

  it("filters invalid nodes", () => {
    const text = `\`\`\`json
{"nodes":[{"id":"x","name":"ok"},{"bad":true}],"edges":[]}
\`\`\``;
    const g = extractConceptGraph(text);
    expect(g?.nodes).toHaveLength(1);
  });
});

describe("stripConceptGraphBlock", () => {
  it("removes trailing json fence", () => {
    const text = `Reply text\n\`\`\`json\n{"nodes":[],"edges":[]}\n\`\`\`\n`;
    expect(stripConceptGraphBlock(text)).toBe("Reply text");
  });
});

describe("buildConceptGraphPromptWindow", () => {
  it("keeps only nodes from the last N batches", () => {
    const full = {
      nodes: [
        { id: "a", name: "A", description: "a" },
        { id: "b", name: "B", description: "b" },
        { id: "c", name: "C", description: "c" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "a", target: "c" },
      ],
      batches: [
        { id: "b1", nodeIds: ["a"] },
        { id: "b2", nodeIds: ["b"] },
        { id: "b3", nodeIds: ["c"] },
      ],
    };
    const w = buildConceptGraphPromptWindow(full, 2);
    expect(w?.nodes.map((n) => n.id).sort()).toEqual(["b", "c"]);
    expect(w?.batches?.map((b) => b.id)).toEqual(["b2", "b3"]);
  });

  it("includes only edges with both endpoints in the window", () => {
    const full = {
      nodes: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
      batches: [
        { id: "b2", nodeIds: ["b"] },
        { id: "b3", nodeIds: ["c"] },
      ],
    };
    const w = buildConceptGraphPromptWindow(full, 2);
    expect(w?.edges).toEqual([{ source: "b", target: "c" }]);
  });

  it("returns null when graph is null or has no nodes", () => {
    expect(buildConceptGraphPromptWindow(null, 3)).toBeNull();
    expect(buildConceptGraphPromptWindow({ nodes: [], edges: [] }, 3)).toBeNull();
  });

  it("when batches are missing, uses tail nodes (~window * 6) and internal edges", () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      name: `N${i}`,
    }));
    const full = {
      nodes,
      edges: [
        { source: "n17", target: "n18" },
        { source: "n18", target: "n19" },
        { source: "n0", target: "n19" },
      ],
    };
    const w = buildConceptGraphPromptWindow(full, 3);
    expect(w?.nodes).toHaveLength(18);
    expect(w?.nodes[0]?.id).toBe("n2");
    expect(w?.nodes[17]?.id).toBe("n19");
    expect(w?.edges).toEqual([
      { source: "n17", target: "n18" },
      { source: "n18", target: "n19" },
    ]);
  });
});

describe("preProcess with windowed conceptGraph", () => {
  it("embeds only the window slice, not older batch nodes", async () => {
    const full = {
      nodes: [
        { id: "old", name: "Old" },
        { id: "new", name: "New" },
      ],
      edges: [{ source: "old", target: "new" }],
      batches: [
        { id: "batch-1", nodeIds: ["old"] },
        { id: "batch-2", nodeIds: ["new"] },
      ],
    };
    const windowed = buildConceptGraphPromptWindow(full, 1);
    const out = await preProcess(
      [{ role: "user", content: "hi" }],
      { conceptGraph: windowed }
    );
    const content = out[0]?.content ?? "";
    expect(content).toContain('"id":"new"');
    expect(content).not.toContain('"id":"old"');
  });

  it("uses default batch window size constant for typical window calls", () => {
    expect(CONCEPT_GRAPH_PROMPT_BATCH_WINDOW).toBe(3);
  });
});

describe("conversationTableForSend", () => {
  it("keeps graph and chat on separate tables", () => {
    expect(conversationTableForSend("graph")).toBe("messages");
    expect(conversationTableForSend("chat")).toBe("chatMessages");
  });
});

describe("buildReferencedConceptsSystemNote", () => {
  it("returns null when no nodes", () => {
    expect(buildReferencedConceptsSystemNote(undefined)).toBeNull();
    expect(buildReferencedConceptsSystemNote([])).toBeNull();
  });

  it("lists referenced concept names for the chat model", () => {
    expect(
      buildReferencedConceptsSystemNote([
        { name: "Murmuration", description: "Flock motion" },
        { name: "Boids" },
      ]),
    ).toBe(
      "The user referenced these concepts:\n- Murmuration: Flock motion\n- Boids",
    );
  });
});
