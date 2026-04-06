import { useEffect } from "react";
import {
  SESSION_ACCENT_THINK,
  SESSION_ACCENT_WORK,
} from "@/constants/sessionAccent";

/**
 * Applies session accent CSS variables on document root for the current work preference mode.
 */
export function useSessionAccentCssVars(
  mode: "think" | "work",
): void {
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
}
