import { useAtom } from "jotai";
import { workPreferenceModeAtom } from "../atoms/workPreferenceAtoms";
import type { WorkPreferenceMode } from "../lib/workPreferenceStorage";

export function useWorkPreference(): {
  mode: WorkPreferenceMode;
  isWorkMode: boolean;
  setMode: (mode: WorkPreferenceMode) => void;
} {
  const [mode, setMode] = useAtom(workPreferenceModeAtom);
  return {
    mode,
    isWorkMode: mode === "work",
    setMode,
  };
}
