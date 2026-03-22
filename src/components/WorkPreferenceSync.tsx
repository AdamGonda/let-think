import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { workPreferenceModeAtom } from "../atoms/workPreferenceAtoms";
import {
  SESSION_ACCENT_THINK,
  SESSION_ACCENT_WORK,
} from "../constants/sessionAccent";

export function WorkPreferenceSync() {
  const mode = useAtomValue(workPreferenceModeAtom);
  const applyWorkPreferenceMode = useMutation(
    api.interactionSessions.applyWorkPreferenceMode,
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
    void applyWorkPreferenceMode({
      mode: mode === "think" ? "restrict" : "open",
    });
  }, [mode, applyWorkPreferenceMode]);

  return null;
}
