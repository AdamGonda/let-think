import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  SESSION_ACCENT_THINK,
  SESSION_ACCENT_WORK,
} from "../constants/sessionAccent";
import {
  readWorkPreference,
  writeWorkPreference,
  WORK_PREFERENCE_STORAGE_KEY,
  type WorkPreferenceMode,
} from "../lib/workPreferenceStorage";

type WorkPreferenceContextValue = {
  mode: WorkPreferenceMode;
  /** True when Work (green) — unlimited interactions. Think caps interactions + breaks. */
  isWorkMode: boolean;
  setMode: (mode: WorkPreferenceMode) => void;
};

const WorkPreferenceContext = createContext<WorkPreferenceContextValue | null>(
  null,
);

export function WorkPreferenceProvider({
  activeSessionId,
  children,
}: {
  activeSessionId: Id<"sessions"> | null;
  children: ReactNode;
}) {
  const setInteractionRestriction = useMutation(
    api.sessions.setInteractionRestriction,
  );
  const [mode, setModeState] = useState<WorkPreferenceMode>(() =>
    readWorkPreference(),
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WORK_PREFERENCE_STORAGE_KEY && e.newValue != null) {
        if (e.newValue === "work" || e.newValue === "think") {
          setModeState(e.newValue);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: WorkPreferenceMode) => {
    writeWorkPreference(next);
    setModeState(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const accent = mode === "work" ? SESSION_ACCENT_WORK : SESSION_ACCENT_THINK;
    root.style.setProperty("--session-accent", accent);
    root.style.setProperty("--sidebar-primary", accent);
    return () => {
      root.style.removeProperty("--session-accent");
      root.style.removeProperty("--sidebar-primary");
    };
  }, [mode]);

  useEffect(() => {
    if (!activeSessionId) return;
    void setInteractionRestriction({
      sessionId: activeSessionId,
      mode: mode === "think" ? "restrict" : "open",
    });
  }, [activeSessionId, mode, setInteractionRestriction]);

  const value = useMemo<WorkPreferenceContextValue>(
    () => ({
      mode,
      isWorkMode: mode === "work",
      setMode,
    }),
    [mode, setMode],
  );

  return (
    <WorkPreferenceContext.Provider value={value}>
      {children}
    </WorkPreferenceContext.Provider>
  );
}

export function useWorkPreference(): WorkPreferenceContextValue {
  const ctx = useContext(WorkPreferenceContext);
  if (!ctx) {
    throw new Error("useWorkPreference must be used within WorkPreferenceProvider");
  }
  return ctx;
}
