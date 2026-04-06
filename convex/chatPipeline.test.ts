import { describe, expect, it } from "vitest";
import { extractConceptGraph, stripConceptGraphBlock } from "./chatPipeline";

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
