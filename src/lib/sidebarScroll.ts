import type { Id } from "../../convex/_generated/dataModel";

const sidebarSessionElementId = (sessionId: Id<"sessions">) =>
  `sidebar-session-${sessionId}`;

/**
 * Scrolls the sidebar list so the active session row is visible (double rAF matches layout paint).
 */
export function scrollSidebarSessionIntoView(
  sessionId: Id<"sessions">,
  options: ScrollIntoViewOptions = { block: "nearest", behavior: "smooth" },
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document
        .getElementById(sidebarSessionElementId(sessionId))
        ?.scrollIntoView(options);
    });
  });
}
