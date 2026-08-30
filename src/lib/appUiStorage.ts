import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext, SessionView } from "@/machines/appUiTypes";

const STORAGE_KEY_ACTIVE_SESSION = "think-active-session-id";
const STORAGE_KEY_ACTIVE_PROJECT = "think-active-project-id";
const STORAGE_KEY_HAS_EVER_SELECTED = "think-has-ever-session-selection";
const STORAGE_KEY_SESSION_VIEW = "think-session-view";

type StoredAppUiSelection = Pick<
  AppUiContext,
  | "activeSessionId"
  | "activeProjectId"
  | "hasEverHadSessionSelection"
  | "sessionView"
>;

function parseSessionView(value: string | null): SessionView {
  return value === "chat" ? "chat" : "graph";
}

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
  let sessionView: SessionView = "graph";
  try {
    sessionView = parseSessionView(localStorage.getItem(STORAGE_KEY_SESSION_VIEW));
  } catch {
    sessionView = "graph";
  }
  return {
    activeSessionId,
    activeProjectId,
    hasEverHadSessionSelection,
    sessionView,
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
    localStorage.setItem(STORAGE_KEY_SESSION_VIEW, value.sessionView);
  } catch {
    /* ignore persistence failures */
  }
}
