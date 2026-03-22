import { atomWithStorage } from "jotai/utils";
import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";
import {
  WORK_PREFERENCE_STORAGE_KEY,
  type WorkPreferenceMode,
} from "../lib/workPreferenceStorage";

const thinkWorkStorage: SyncStorage<WorkPreferenceMode> = {
  getItem: (key, initialValue) => {
    if (typeof window === "undefined") return initialValue;
    try {
      const v = localStorage.getItem(key);
      if (v === "work" || v === "think") return v;
    } catch {
      /* ignore */
    }
    return initialValue;
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  subscribe: (key, callback, initialValue: WorkPreferenceMode) => {
    void initialValue;
    if (typeof window === "undefined") return undefined;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      if (e.newValue === "work" || e.newValue === "think") {
        callback(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
};

export const workPreferenceModeAtom = atomWithStorage<WorkPreferenceMode>(
  WORK_PREFERENCE_STORAGE_KEY,
  "think",
  thinkWorkStorage,
);
