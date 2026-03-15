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
  // Default: pass through unchanged
  // Example: inject a system message, modify the last user message, etc.
  return messages;
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
