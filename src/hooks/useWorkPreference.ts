import { useAppUiActor, useAppUiSelector } from "./useAppUi";
import type { WorkPreferenceMode } from "../lib/workPreferenceStorage";

export function useWorkPreference(): {
  mode: WorkPreferenceMode;
  isWorkMode: boolean;
  setMode: (mode: WorkPreferenceMode) => void;
} {
  const actor = useAppUiActor();
  const mode = useAppUiSelector((s) => s.context.preference);
  return {
    mode,
    isWorkMode: mode === "work",
    setMode: (m: WorkPreferenceMode) =>
      actor.send({ type: "PREFERENCE_SET", mode: m }),
  };
}
