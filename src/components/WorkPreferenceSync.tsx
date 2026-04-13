import { useAppUiSelector } from "@/hooks/useAppUi";
import { useSessionAccentCssVars } from "@/hooks/useSessionAccentCssVars";
import { useWorkPreferenceBackendSync } from "@/hooks/useWorkPreferenceBackendSync";

/**
 * Syncs work/think preference to DOM accent tokens and backend interaction policy.
 */
export function WorkPreferenceSync() {
  const mode = useAppUiSelector((s) => s.context.preference);
  useSessionAccentCssVars(mode);
  useWorkPreferenceBackendSync(mode);
  return null;
}
