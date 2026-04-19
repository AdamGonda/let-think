import type { Id } from "../../convex/_generated/dataModel";

export function useSessionManager(sessionId: Id<"sessions"> | null) {
  return {
    canSend: !!sessionId,
  };
}
