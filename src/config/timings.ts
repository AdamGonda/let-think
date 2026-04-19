/** Millisecond delays, debounces, and intervals used across the app. */
export const timings = {
  projectRowClickDelayMs: 150,
  wakeUpEditorRevealMs: 50,
  draftSaveDebounceMs: 400,
  /** Checkmark duration after copy — matches conversation history + graph cards */
  copiedFeedbackMs: 2000,
  tutorialStartDelayMs: 600,
  breakCountdownTickMs: 1000,
  wakeUpExitMs: 300,
  sidebarCollapseAfterEditorOpenMs: 420,
  paginationDotsSpringMs: 300,
} as const;
