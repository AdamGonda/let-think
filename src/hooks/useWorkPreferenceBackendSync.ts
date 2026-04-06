import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Mirrors app UI work/think preference to the backend interaction session policy.
 */
export function useWorkPreferenceBackendSync(
  mode: "think" | "work",
): void {
  const applyWorkPreferenceMode = useMutation(
    api.interactionSessions.applyWorkPreferenceMode,
  );

  useEffect(() => {
    void applyWorkPreferenceMode({
      mode: mode === "think" ? "restrict" : "open",
    });
  }, [mode, applyWorkPreferenceMode]);
}
