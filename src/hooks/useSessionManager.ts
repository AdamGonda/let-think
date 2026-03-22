import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function formatBreakCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useSessionManager(sessionId: Id<"sessions"> | null) {
  const state = useQuery(
    api.interactionSessions.get,
    sessionId ? { sessionId } : "skip"
  );
  const recordInteraction = useMutation(api.interactionSessions.recordInteraction);
  const startBreakOptimisticallyMutation = useMutation(
    api.interactionSessions.startBreakOptimistically
  );
  const resetAfterBreak = useMutation(api.interactionSessions.resetAfterBreak);
  const hasResetRef = useRef(false);

  const [breakRemainingMs, setBreakRemainingMs] = useState<number | null>(null);

  // Sync breakRemainingMs from Convex state when it changes
  useEffect(() => {
    if (!sessionId || !state?.breakEndsAt) {
      setBreakRemainingMs(null);
      hasResetRef.current = false;
      return;
    }
    if (Date.now() >= state.breakEndsAt) {
      setBreakRemainingMs(null);
      return;
    }
    hasResetRef.current = false;
    setBreakRemainingMs(Math.max(0, state.breakEndsAt - Date.now()));
  }, [sessionId, state?.breakEndsAt]);

  // Timer for break countdown - tick every second and reset when done
  useEffect(() => {
    if (breakRemainingMs === null || breakRemainingMs <= 0) return;
    const interval = setInterval(() => {
      if (!sessionId || !state?.breakEndsAt) {
        setBreakRemainingMs(null);
        return;
      }
      const remaining = Math.max(0, state.breakEndsAt - Date.now());
      setBreakRemainingMs(remaining);
      if (remaining === 0 && !hasResetRef.current) {
        hasResetRef.current = true;
        setBreakRemainingMs(null);
        resetAfterBreak({ sessionId });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId, state?.breakEndsAt, breakRemainingMs, resetAfterBreak]);

  const inBreak = breakRemainingMs !== null && breakRemainingMs > 0;

  const canSend =
    !!sessionId &&
    !inBreak &&
    (state == null ||
      state.mode === "open" ||
      state.used < state.limit);

  const remaining =
    state != null && state.mode === "restrict"
      ? Math.max(0, state.limit - state.used)
      : null;

  const interactionRestriction =
    state?.mode ?? ("open" as const);

  const onInteractionComplete = useCallback(async () => {
    if (!sessionId) return;
    await recordInteraction({ sessionId });
  }, [sessionId, recordInteraction]);

  const startBreakOptimistically = useCallback(async () => {
    if (!sessionId) return;
    await startBreakOptimisticallyMutation({ sessionId });
  }, [sessionId, startBreakOptimisticallyMutation]);

  return {
    interactionRestriction,
    canSend,
    remaining,
    breakRemainingMs,
    breakRemainingFormatted:
      breakRemainingMs !== null && breakRemainingMs > 0
        ? formatBreakCountdown(breakRemainingMs)
        : null,
    onInteractionComplete,
    startBreakOptimistically,
  };
}
