/** Think-mode break duration after interaction limit is reached. */
export const BREAK_MS = 10 * 60 * 1000;

/** Interactions allowed in restrict mode before a break. */
export const RESTRICT_INTERACTION_LIMIT = 3;

/** User prompt slice sent to the summarization model. */
export const PROMPT_SUMMARY_INPUT_MAX_CHARS = 500;

/** Max length for AI-generated prompt summary line. */
export const PROMPT_SUMMARY_OUTPUT_MAX_CHARS = 100;

/** Stored preview of user prompt on concept graph batches. */
export const BATCH_PROMPT_SUMMARY_MAX_CHARS = 60;

/** How many recent batches to include in the LLM prompt (token budget). */
export const CONCEPT_GRAPH_PROMPT_BATCH_WINDOW = 3;

/** Auto title from first user message when session title is still default. */
export const SESSION_TITLE_FROM_FIRST_MESSAGE_MAX_CHARS = 50;
