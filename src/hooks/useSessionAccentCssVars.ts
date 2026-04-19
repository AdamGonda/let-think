import { useEffect } from "react";
import { SESSION_ACCENT } from "@/constants/sessionAccent";

/** Applies default session accent CSS variables on document root. */
export function useSessionAccentCssVars(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--session-accent", SESSION_ACCENT);
    root.style.setProperty("--sidebar-primary", SESSION_ACCENT);
    return () => {
      root.style.removeProperty("--session-accent");
      root.style.removeProperty("--sidebar-primary");
    };
  }, []);
}
