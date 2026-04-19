/**
 * Layout tokens as full Tailwind classes so arbitrary values stay discoverable by the compiler.
 */
export const layout = {
  wakeUpOverlayZIndexClass: "z-[9999]",
  mainColumnMaxWidthClass: "max-w-[720px]",
  /** Inner session input card (composer + historical dock): matches empty single-line textarea row + padding. */
  sessionInputChromeMinClass: "min-h-[4.75rem]",
  /** Historical prompt expanded panel: stack above graph / cards. */
  sessionInputExpandedOverlayZClass: "z-40",
  /**
   * Bottom padding for the graph scroll viewport when viewing a non-latest batch (includes
   * base 1rem plus reserve so card rows match the last step with full composer height).
   */
  graphViewportBottomPadNonLatestClass: "pb-14",
} as const;
