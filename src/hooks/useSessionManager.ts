import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useAtomValue } from "jotai";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { workPreferenceModeAtom } from "../atoms/workPreferenceAtoms";

export function formatBreakCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useSessionManager(sessionId: Id<"sessions"> | null) {
  const authToken = useAuthToken();
  const isAuthenticated = authToken !== null;
  const workPreferenceMode = useAtomValue(workPreferenceModeAtom);
  const restrictionFromPreference =
    workPreferenceMode === "think" ? ("restrict" as const) : ("open" as const);
  const state = useQuery(
    api.interactionSessions.get,
    isAuthenticated ? {} : "skip"
  );
  const recordInteraction = useMutation(api.interactionSessions.recordInteraction);
  const startBreakOptimisticallyMutation = useMutation(
    api.interactionSessions.startBreakOptimistically
  );
  const resetAfterBreak = useMutation(api.interactionSessions.resetAfterBreak);
  const hasResetRef = useRef(false);

  const [breakRemainingMs, setBreakRemainingMs] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!state?.breakEndsAt) {
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
  }, [state?.breakEndsAt]);

  useEffect(() => {
    if (breakRemainingMs === null || breakRemainingMs <= 0) return;
    const interval = setInterval(() => {
      if (!state?.breakEndsAt) {
        setBreakRemainingMs(null);
        return;
      }
      const remaining = Math.max(0, state.breakEndsAt - Date.now());
      setBreakRemainingMs(remaining);
      if (remaining === 0 && !hasResetRef.current) {
        hasResetRef.current = true;
        setBreakRemainingMs(null);
        void resetAfterBreak({});
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.breakEndsAt, breakRemainingMs, resetAfterBreak]);

  const inBreak = breakRemainingMs !== null && breakRemainingMs > 0;

  const canSend =
    !!sessionId &&
    !inBreak &&
    (restrictionFromPreference === "open" ||
      state == null ||
      state.mode === "open" ||
      state.used < state.limit);

  const remaining =
    state != null && state.mode === "restrict"
      ? Math.max(0, state.limit - state.used)
      : null;

  const interactionRestriction =
    restrictionFromPreference === "restrict" ? "restrict" : "open";

  const interactionCountsPending =
    isAuthenticated &&
    restrictionFromPreference === "restrict" &&
    (state === undefined ||
      (state !== null && state.mode === "open"));

  const onInteractionComplete = useCallback(async () => {
    await recordInteraction({});
  }, [recordInteraction]);

  const startBreakOptimistically = useCallback(async () => {
    await startBreakOptimisticallyMutation({});
  }, [startBreakOptimisticallyMutation]);

  return {
    interactionRestriction,
    interactionCountsPending,
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
