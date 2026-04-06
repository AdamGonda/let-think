import { useEffect } from "react";
import { useSelector } from "@xstate/react";
import { useAppUiActor } from "./useAppUi";
import { writeWorkPreference } from "@/lib/workPreferenceStorage";

/**
 * Persists work/think preference to localStorage when machine context changes (IO outside transitions).
 */
export function useAppUiPreferencePersistence(): void {
  const actor = useAppUiActor();
  const preference = useSelector(actor, (s) => s.context.preference);
  useEffect(() => {
    writeWorkPreference(preference);
  }, [preference]);
}
