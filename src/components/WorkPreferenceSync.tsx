import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { activeSessionIdAtom } from "../atoms/appAtoms";
import { workPreferenceModeAtom } from "../atoms/workPreferenceAtoms";
import {
  SESSION_ACCENT_THINK,
  SESSION_ACCENT_WORK,
} from "../constants/sessionAccent";

export function WorkPreferenceSync() {
  const mode = useAtomValue(workPreferenceModeAtom);
  const activeSessionId = useAtomValue(activeSessionIdAtom);
  const setInteractionRestriction = useMutation(
    api.sessions.setInteractionRestriction,
  );

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

  return null;
}
