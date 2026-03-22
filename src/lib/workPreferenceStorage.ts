export const WORK_PREFERENCE_STORAGE_KEY = "think-work-preference";

export type WorkPreferenceMode = "think" | "work";

export function readWorkPreference(): WorkPreferenceMode {
  if (typeof window === "undefined") return "think";
  try {
    const v = localStorage.getItem(WORK_PREFERENCE_STORAGE_KEY);
    if (v === "work" || v === "think") return v;
  } catch {
    /* ignore */
  }
  return "think";
}

export function writeWorkPreference(mode: WorkPreferenceMode) {
  try {
    localStorage.setItem(WORK_PREFERENCE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
