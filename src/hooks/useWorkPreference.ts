import { useAppUiActor, useAppUiSelector } from "./useAppUi";
import type { WorkPreferenceMode } from "../lib/workPreferenceStorage";
import { setWorkPreferenceMode } from "@/lib/appUiCommands";

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
    setMode: (m: WorkPreferenceMode) => setWorkPreferenceMode(actor, m),
  };
}
