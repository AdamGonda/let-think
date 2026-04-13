/**
 * Layout tokens as full Tailwind classes so arbitrary values stay discoverable by the compiler.
 */
export const layout = {
  wakeUpOverlayZIndexClass: "z-[9999]",
  restWalkthroughOverlayZIndexClass: "z-[9998]",
  mainColumnMaxWidthClass: "max-w-[720px]",
} as const;
