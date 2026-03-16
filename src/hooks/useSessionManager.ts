import { useState, useEffect, useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface SessionState {
  limit: number;
  used: number;
  breakEndsAt: number | null;
}

const STORAGE_KEY_PREFIX = "think:session:";
const BREAK_MS = 25 * 60 * 1000;

function getStorageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

function loadState(sessionId: string): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionState).limit === "number" &&
      typeof (parsed as SessionState).used === "number"
    ) {
      const s = parsed as SessionState;
      return {
        limit: s.limit,
        used: s.used,
        breakEndsAt:
          typeof s.breakEndsAt === "number" ? s.breakEndsAt : null,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveState(sessionId: string, state: SessionState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(sessionId), JSON.stringify(state));
}

function pickRandomLimit(): number {
  return Math.floor(Math.random() * 3) + 1;
}

export function formatBreakCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useSessionManager(sessionId: Id<"sessions"> | null) {
  const [state, setState] = useState<SessionState | null>(() =>
    sessionId ? loadState(sessionId) : null
  );
  const [breakRemainingMs, setBreakRemainingMs] = useState<number | null>(() => {
    if (!sessionId) return null;
    const s = loadState(sessionId);
    if (s?.breakEndsAt && Date.now() < s.breakEndsAt) {
      return Math.max(0, s.breakEndsAt - Date.now());
    }
    return null;
  });

  // Reload state when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setState(null);
      setBreakRemainingMs(null);
      return;
    }
    const loaded = loadState(sessionId);
    setState(loaded);
    if (loaded?.breakEndsAt && Date.now() < loaded.breakEndsAt) {
      setBreakRemainingMs(Math.max(0, loaded.breakEndsAt - Date.now()));
    } else {
      setBreakRemainingMs(null);
    }
  }, [sessionId]);

  // Timer for break countdown - tick every second and clear when done
  useEffect(() => {
    if (breakRemainingMs === null || breakRemainingMs <= 0) return;
    const interval = setInterval(() => {
      if (!sessionId) return;
      const s = loadState(sessionId);
      if (!s?.breakEndsAt) {
        setBreakRemainingMs(null);
        return;
      }
      const remaining = Math.max(0, s.breakEndsAt - Date.now());
      setBreakRemainingMs(remaining);
      if (remaining === 0) {
        localStorage.removeItem(getStorageKey(sessionId));
        setState(null);
        setBreakRemainingMs(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId, breakRemainingMs]);

  const inBreak = breakRemainingMs !== null && breakRemainingMs > 0;

  const canSend =
    !!sessionId &&
    !inBreak &&
    (!state || state.used < state.limit);

  const remaining = state ? Math.max(0, state.limit - state.used) : null;
  const limit = state?.limit ?? null;

  const onInteractionComplete = useCallback(() => {
    if (!sessionId || typeof window === "undefined") return;
    let s = loadState(sessionId);

    if (!s) {
      const newLimit = pickRandomLimit();
      s = { limit: newLimit, used: 0, breakEndsAt: null };
      saveState(sessionId, s);
    }

    s = { ...s, used: s.used + 1 };
    if (s.used >= s.limit && !s.breakEndsAt) {
      s.breakEndsAt = Date.now() + BREAK_MS;
    }
    saveState(sessionId, s);
    setState(s);

    if (s.breakEndsAt) {
      setBreakRemainingMs(Math.max(0, s.breakEndsAt - Date.now()));
    }
  }, [sessionId]);

  /** Start the 25 min break immediately when user sends their last allowed message. */
  const startBreakOptimistically = useCallback(() => {
    if (!sessionId || typeof window === "undefined") return;
    let s = loadState(sessionId);

    if (!s) {
      const newLimit = pickRandomLimit();
      s = { limit: newLimit, used: 0, breakEndsAt: null };
      saveState(sessionId, s);
    }

    if (s.used >= s.limit - 1 && !s.breakEndsAt) {
      s = { ...s, breakEndsAt: Date.now() + BREAK_MS };
      saveState(sessionId, s);
      setState(s);
      setBreakRemainingMs(Math.max(0, s.breakEndsAt - Date.now()));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("think:session-break-started", {
            detail: { sessionId },
          })
        );
      }
    }
  }, [sessionId]);

  // React to optimistic break started from another component (e.g. Chat)
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ sessionId: string }>;
      if (ev.detail?.sessionId === sessionId) {
        const s = loadState(sessionId);
        if (s?.breakEndsAt && Date.now() < s.breakEndsAt) {
          setState(s);
          setBreakRemainingMs(Math.max(0, s.breakEndsAt - Date.now()));
        }
      }
    };
    window.addEventListener("think:session-break-started", handler);
    return () => window.removeEventListener("think:session-break-started", handler);
  }, [sessionId]);

  return {
    canSend,
    remaining,
    limit,
    breakRemainingMs,
    breakRemainingFormatted:
      breakRemainingMs !== null && breakRemainingMs > 0
        ? formatBreakCountdown(breakRemainingMs)
        : null,
    onInteractionComplete,
    startBreakOptimistically,
  };
}
