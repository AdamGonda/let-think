import type { ModelMessage } from "ai";

export type ConceptGraph = {
  nodes: Array< { id: string; name: string; description?: string } >;
  edges: Array< { source: string; target: string } >;
  /** Batches for UI traversal – nodeIds per batch */
  batches?: Array< {
    id: string;
    nodeIds: string[];
    promptSummary?: string;
    description?: string;
  } >;
};

/** Extract CONCEPT GRAPH from LLM response (expects ```json ... ``` block, prefers last one at end). */
export function extractConceptGraph(text: string): ConceptGraph | null {
  let matches = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (matches.length === 0) {
    matches = [...text.matchAll(/```\s*([\s\S]*?)```/g)].filter(
      (m) => m[1]?.trim().startsWith("{") && m[1]?.includes('"nodes"')
    );
  }
  const match = matches.length > 0 ? matches[matches.length - 1] : null;
  if (!match || !match[1]) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as ConceptGraph).nodes) &&
      Array.isArray((parsed as ConceptGraph).edges)
    ) {
      const g = parsed as ConceptGraph;
      return {
        nodes: g.nodes.filter(
          (n) =>
            n &&
            typeof n.id === "string" &&
            typeof n.name === "string" &&
            (n.description === undefined || typeof n.description === "string")
        ).map((n) => ({
          id: n.id,
          name: n.name,
          ...(n.description != null ? { description: n.description } : {}),
        })),
        edges: g.edges.filter(
          (e) =>
            e &&
            typeof e.source === "string" &&
            typeof e.target === "string"
        ),
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/** Strip the ```json ... ``` block from the response for display. */
export function stripConceptGraphBlock(text: string): string {
  return text.replace(/\n*```json\s*[\s\S]*?```\s*$/i, "").trim();
}

/**
 * Chat pipeline with pre and post processing hooks.
 * Modify these to customize behavior around LLM calls.
 */

export type PipelineContext = {
  sessionId?: string;
  /** Existing concept graph to merge new nodes into */
  conceptGraph?: ConceptGraph | null;
  /** Branching spectrum 1-3: max number of new nodes (n) to generate per response */
  branching?: number;
  /** User-selected nodes to add as context to the prompt */
  selectedNodes?: Array<{ id: string; name: string; description?: string }>;
  /** Any metadata you want to pass through */
  meta?: Record<string, unknown>;
};

/**
 * Pre-process messages before calling the LLM.
 * Use this to: add context, modify user input, inject system prompts, etc.
 */
export async function preProcess(
  messages: ModelMessage[],
  ctx?: PipelineContext
): Promise<ModelMessage[]> {
  const existing = ctx?.conceptGraph;
  const n = Math.min(3, Math.max(1, ctx?.branching ?? 2));
  const graphContext = existing
    ? `\n\nEXISTING CONCEPT GRAPH (merge new nodes into this):\n${JSON.stringify(existing)}`
    : "";

  const selectedContext =
    ctx?.selectedNodes && ctx.selectedNodes.length > 0
      ? `\n\nADDITIONAL CONTEXT - USER-SELECTED CONCEPTS:\nThe user has explicitly selected the following concepts to focus on. Please incorporate and address these in your response:\n${ctx.selectedNodes.map((node) => `- ${node.name}: ${node.description ?? node.id}`).join("\n")}`
      : "";

  const prompt = `
You have access to the whole conversation history, and a CONCEPT GRAPH,
where the nodes are concepts or reasoning from the conversation.

IF NO CONCEPT GRAPH EXISTS IN CONTEXT:
Generate a new CONCEPT GRAPH from scratch based on the ideas in your response.

IF CONCEPT GRAPH EXISTS:
Add new nodes to the CONCEPT GRAPH based on ideas in your response.

Rules:
- The user has set BRANCHING to ${n}. Generate 1 to ${n} concepts (nodes) based on ideas in your response. Not 0.
- Each node must have: id (unique string), name (short label, 1–3 words), and description (a clear 1–2 sentence explanation of the concept—not just a single word).
- Connect nodes with edges so the graph stays connected.
- You MUST end your response with the CONCEPT GRAPH as valid JSON in a code block. No exceptions.
- Example: if your answer discusses "graph" and "Convex", create nodes with descriptive explanations and link them.

Put this EXACTLY at the very end of your reply (after all other text):

\`\`\`json
{"nodes":[{"id":"1","name":"Graph","description":"A data structure representing nodes and connections between them, used for modeling relationships."},{"id":"2","name":"Convex","description":"A serverless backend platform providing real-time database and backend functions."}],"edges":[{"source":"1","target":"2"}]}
\`\`\`
${graphContext}
${selectedContext}
`;

  return [
    {
      role: "system",
      content: prompt,
    },
    ...messages,
  ];
}

/**
 * Post-process the LLM response before returning to the client.
 * Strips the concept graph JSON block so it isn't shown in the chat.
 */
export async function postProcess(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: PipelineContext
): Promise<string> {
  return stripConceptGraphBlock(text);
}
