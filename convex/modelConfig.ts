/**
 * Centralized model configuration for AI features.
 *
 * Update these values to change which model powers each task.
 */
export const modelConfig = {
  /**
   * Main chat response model.
   * This drives assistant output and concept-graph extraction.
   */
  mainContextGraphModel: "gemini-3-flash-preview",

  /**
   * Fallback-ordered models used for short generated labels,
   * such as user prompt titles/headers shown in UI.
   */
  titleAndHeaderModels: ["gemini-3-flash-preview"],
} as const;

