/**
 * Layout tokens as full Tailwind classes so arbitrary values stay discoverable by the compiler.
 */
export const layout = {
  wakeUpOverlayZIndexClass: "z-[9999]",
  /** Backed by a CSS var (set by useMainColumnWidth) so the writing column stays user-adjustable. */
  mainColumnMaxWidthClass: "max-w-[var(--main-column-width)]",
  mainColumnWidthCssVar: "--main-column-width",
  mainColumnWidthDefaultPx: 960,
  mainColumnWidthMinPx: 640,
  mainColumnWidthMaxPx: 1200,
  /** Inner session input card (composer + historical dock): matches empty single-line textarea row + padding. */
  sessionInputChromeMinClass: "min-h-[4.75rem]",
  /**
   * Graph + file editor top bar — same grid, height, and padding so chrome does not jump
   * when switching.
   */
  workspaceTopBarClass:
    "grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 h-14 px-4",
  /** Historical prompt expanded panel: stack above graph / cards. */
  sessionInputExpandedOverlayZClass: "z-40",
  /**
   * Bottom padding for the graph scroll viewport when viewing a non-latest batch (includes
   * base 1rem plus reserve so card rows match the last step with full composer height).
   */
  graphViewportBottomPadNonLatestClass: "pb-14",
} as const;
