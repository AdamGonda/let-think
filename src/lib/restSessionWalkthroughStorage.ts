import type { Id } from "../../convex/_generated/dataModel";

const PREFIX = "think-rest-walkthrough-done:";

export function isRestWalkthroughDoneForSession(
  sessionId: Id<"sessions">,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREFIX + sessionId) === "1";
  } catch {
    return false;
  }
}

export function markRestWalkthroughDoneForSession(
  sessionId: Id<"sessions">,
): void {
  try {
    localStorage.setItem(PREFIX + sessionId, "1");
  } catch {
    /* ignore */
  }
}
