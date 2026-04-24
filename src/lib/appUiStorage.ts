import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext } from "@/machines/appUiTypes";

const STORAGE_KEY_ACTIVE_SESSION = "think-active-session-id";
const STORAGE_KEY_ACTIVE_PROJECT = "think-active-project-id";
const STORAGE_KEY_HAS_EVER_SELECTED = "think-has-ever-session-selection";

type StoredAppUiSelection = Pick<
  AppUiContext,
  "activeSessionId" | "activeProjectId" | "hasEverHadSessionSelection"
>;

function getStoredId(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getStoredAppUiSelection(): StoredAppUiSelection {
  const activeSessionId = getStoredId(STORAGE_KEY_ACTIVE_SESSION) as Id<"sessions"> | null;
  const activeProjectId = getStoredId(STORAGE_KEY_ACTIVE_PROJECT) as Id<"projects"> | null;
  let hasEverHadSessionSelection = false;
  try {
    hasEverHadSessionSelection =
      localStorage.getItem(STORAGE_KEY_HAS_EVER_SELECTED) === "true";
  } catch {
    hasEverHadSessionSelection = false;
  }
  return {
    activeSessionId,
    activeProjectId,
    hasEverHadSessionSelection,
  };
}

export function setStoredAppUiSelection(value: StoredAppUiSelection): void {
  try {
    if (value.activeSessionId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, value.activeSessionId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    }

    if (value.activeProjectId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, value.activeProjectId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJECT);
    }

    localStorage.setItem(
      STORAGE_KEY_HAS_EVER_SELECTED,
      value.hasEverHadSessionSelection ? "true" : "false",
    );
  } catch {
    /* ignore persistence failures */
  }
}
