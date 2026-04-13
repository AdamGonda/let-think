/**
 * Layout tokens as full Tailwind classes so arbitrary values stay discoverable by the compiler.
 */
export const layout = {
  wakeUpOverlayZIndexClass: "z-[9999]",
  restWalkthroughOverlayZIndexClass: "z-[9998]",
  mainColumnMaxWidthClass: "max-w-[720px]",
  /** Inner session input card (composer + historical dock): matches empty single-line textarea row + padding. */
  sessionInputChromeMinClass: "min-h-[4.75rem]",
  /** Expanded historical prompt floats above the graph; keep above card surface. */
  sessionInputExpandedOverlayZClass: "z-40",
} as const;
