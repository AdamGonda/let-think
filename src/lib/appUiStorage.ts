import type { Id } from "../../convex/_generated/dataModel";
import type { AppUiContext, SessionView } from "@/machines/appUiTypes";

const STORAGE_KEY_ACTIVE_SESSION = "think-active-session-id";
const STORAGE_KEY_ACTIVE_FILE = "think-active-file-id";
const STORAGE_KEY_ACTIVE_CHAT = "think-active-chat-session-id";
const STORAGE_KEY_ACTIVE_PROJECT = "think-active-project-id";
const STORAGE_KEY_HAS_EVER_SELECTED = "think-has-ever-session-selection";
const STORAGE_KEY_SESSION_VIEW = "think-session-view";

type StoredAppUiSelection = Pick<
  AppUiContext,
  | "activeFileId"
  | "activeChatSessionId"
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

function setStoredId(key: string, value: string | null): void {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}

export function getStoredAppUiSelection(): StoredAppUiSelection {
  const activeSessionId = getStoredId(STORAGE_KEY_ACTIVE_SESSION) as Id<"sessions"> | null;
  const activeFileId = getStoredId(STORAGE_KEY_ACTIVE_FILE) as Id<"files"> | null;
  const activeChatSessionId = getStoredId(
    STORAGE_KEY_ACTIVE_CHAT,
  ) as Id<"chatSessions"> | null;
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
    activeFileId,
    activeChatSessionId,
    activeSessionId,
    activeProjectId,
    hasEverHadSessionSelection,
    sessionView,
  };
}

export function setStoredAppUiSelection(value: StoredAppUiSelection): void {
  try {
    setStoredId(STORAGE_KEY_ACTIVE_SESSION, value.activeSessionId);
    setStoredId(STORAGE_KEY_ACTIVE_FILE, value.activeFileId);
    setStoredId(STORAGE_KEY_ACTIVE_CHAT, value.activeChatSessionId);
    setStoredId(STORAGE_KEY_ACTIVE_PROJECT, value.activeProjectId);
    localStorage.setItem(
      STORAGE_KEY_HAS_EVER_SELECTED,
      value.hasEverHadSessionSelection ? "true" : "false",
    );
    localStorage.setItem(STORAGE_KEY_SESSION_VIEW, value.sessionView);
  } catch {
    /* ignore persistence failures */
  }
}
