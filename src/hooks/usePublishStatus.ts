import { useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook for the per-session publish toggle on the user's own session cards.
 * Wraps `isPublished` query + `publish`/`unpublish` mutations.
 * Concurrent toggles are ignored via a ref (no local React state).
 */
export function usePublishStatus(sessionId: Id<"sessions">) {
  const isPublished = useQuery(api.publishedSessions.isPublished, { sessionId });
  const publishMutation = useMutation(api.publishedSessions.publish);
  const unpublishMutation = useMutation(api.publishedSessions.unpublish);
  const inFlightRef = useRef(false);

  const togglePublish = useCallback(async () => {
    if (isPublished === undefined || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (isPublished) {
        await unpublishMutation({ sessionId });
        toast.success("Note unpublished");
      } else {
        await publishMutation({ sessionId });
        toast.success("Note published");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update publish state";
      toast.error(message);
    } finally {
      inFlightRef.current = false;
    }
  }, [isPublished, publishMutation, unpublishMutation, sessionId]);

  return {
    isPublished: isPublished === undefined ? null : isPublished,
    togglePublish,
  };
}
