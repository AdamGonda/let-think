import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAppUiSelector } from "./useAppUi";
import type { WorkPreferenceMode } from "../lib/workPreferenceStorage";
import { timings } from "@/config";
import { formatBreakCountdown } from "../lib/formatBreakCountdown";

export { formatBreakCountdown };

export function useSessionManager(sessionId: Id<"sessions"> | null) {
  const authToken = useAuthToken();
  const isAuthenticated = authToken !== null;
  const workPreferenceMode = useAppUiSelector(
    (s): WorkPreferenceMode => s.context.preference,
  );
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

  /* eslint-disable react-hooks/set-state-in-effect -- layout-sync local countdown to Convex `breakEndsAt` */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
    }, timings.breakCountdownTickMs);
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

  /** Prefer Convex interaction policy when loaded; UI preference only while query is pending. */
  const interactionRestriction: "open" | "restrict" =
    state !== undefined && state !== null
      ? state.mode === "restrict"
        ? "restrict"
        : "open"
      : restrictionFromPreference === "restrict"
        ? "restrict"
        : "open";

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
