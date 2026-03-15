import type { ModelMessage } from "ai";

/**
 * Chat pipeline with pre and post processing hooks.
 * Modify these to customize behavior around LLM calls.
 */

export type PipelineContext = {
  sessionId?: string;
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
  const prompt = `
  You have access to the whole conversation history, and a CONCEPT GRAPH,
  where the nodes are concepts or reasoning summarized into one word.

  So based on that CONCEPT GRAPH or if it does not exists in the context generate one from scratch

  "json
  example
  CONCEPT GRAPH:
  {
    "nodes": [
      {
        "id": "1",
        "name": "Concept 1"
      }
    ],
    "edges": [
      {
        "source": "1",
        "target": "2"
      }
    ]
  }
  "

  Your have to find 0-n number of nodes aka concepts based on the ideas on you response

  IF NO CONCEPT GRAPH:
  Generate a new CONCEPT GRAPH from scratch based on the ideas on you response

  IF CONCEPT GRAPH EXISTS:
  Add the new nodes to the CONCEPT GRAPH

  Your response should follow CONCEPT GRAPH JSON object structure

  and based on the n number of nodes connect them so the graph is connected
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
 * Use this to: reformat output, add structure, filter content, etc.
 */
export async function postProcess(
  text: string,
  ctx?: PipelineContext
): Promise<string> {
  // Default: pass through unchanged
  return text;
}
