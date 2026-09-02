import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "@/lib/notesListUtils";
import type { AppUiContext, SessionView, SurfaceMode } from "@/machines/appUiTypes";

const STORAGE_KEY_ACTIVE_SESSION = "think-active-session-id";
const STORAGE_KEY_ACTIVE_FILE = "think-active-file-id";
const STORAGE_KEY_ACTIVE_CHAT = "think-active-chat-session-id";
const STORAGE_KEY_ACTIVE_PROJECT = "think-active-project-id";
const STORAGE_KEY_HAS_EVER_SELECTED = "think-has-ever-session-selection";
const STORAGE_KEY_SESSION_VIEW = "think-session-view";
const STORAGE_KEY_SURFACE_MODE = "think-surface-mode";
const STORAGE_KEY_NOTES_LIST_DRILL = "think-notes-list-drill";
const STORAGE_KEY_EDITOR_OPEN = "think-editor-open";
const STORAGE_KEY_SELECTED_BATCH_INDEX = "think-selected-batch-index";
const STORAGE_KEY_PREV_BATCHES_LENGTH = "think-prev-batches-length";

export type StoredAppUiSelection = Pick<
  AppUiContext,
  | "activeFileId"
  | "activeChatSessionId"
  | "activeSessionId"
  | "activeProjectId"
  | "hasEverHadSessionSelection"
  | "sessionView"
  | "surfaceMode"
  | "notesListDrill"
  | "editorOpen"
  | "selectedBatchIndex"
  | "prevBatchesLength"
>;

function parseSessionView(value: string | null): SessionView {
  if (value === "chat" || value === "canvas") return value;
  return "graph";
}

function parseSurfaceMode(value: string | null): SurfaceMode {
  if (value === "graph") return "graph";
  return "notesList";
}

function parseNotesListDrill(value: string | null): NotesListDrill {
  if (value == null || value === "" || value === "null") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null) return null;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("type" in parsed)) return null;
    if (parsed.type === "inbox") return { type: "inbox" };
    if (
      parsed.type === "project" &&
      "id" in parsed &&
      typeof parsed.id === "string" &&
      parsed.id.length > 0
    ) {
      return { type: "project", id: parsed.id as Id<"projects"> };
    }
    return null;
  } catch {
    return null;
  }
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return fallback;
  return n;
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

function getStoredItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
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
  const sessionView = parseSessionView(getStoredItem(STORAGE_KEY_SESSION_VIEW));
  const surfaceMode = parseSurfaceMode(getStoredItem(STORAGE_KEY_SURFACE_MODE));
  const notesListDrill = parseNotesListDrill(getStoredItem(STORAGE_KEY_NOTES_LIST_DRILL));
  let editorOpen = false;
  try {
    editorOpen = localStorage.getItem(STORAGE_KEY_EDITOR_OPEN) === "true";
  } catch {
    editorOpen = false;
  }
  const selectedBatchIndex = parseNonNegativeInt(
    getStoredItem(STORAGE_KEY_SELECTED_BATCH_INDEX),
    0,
  );
  const prevBatchesLength = parseNonNegativeInt(
    getStoredItem(STORAGE_KEY_PREV_BATCHES_LENGTH),
    0,
  );
  return {
    activeFileId,
    activeChatSessionId,
    activeSessionId,
    activeProjectId,
    hasEverHadSessionSelection,
    sessionView,
    surfaceMode,
    notesListDrill,
    editorOpen,
    selectedBatchIndex,
    prevBatchesLength,
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
    localStorage.setItem(STORAGE_KEY_SURFACE_MODE, value.surfaceMode);
    localStorage.setItem(
      STORAGE_KEY_NOTES_LIST_DRILL,
      JSON.stringify(value.notesListDrill),
    );
    if (value.editorOpen) {
      localStorage.setItem(STORAGE_KEY_EDITOR_OPEN, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY_EDITOR_OPEN);
    }
    localStorage.setItem(
      STORAGE_KEY_SELECTED_BATCH_INDEX,
      String(value.selectedBatchIndex),
    );
    localStorage.setItem(
      STORAGE_KEY_PREV_BATCHES_LENGTH,
      String(value.prevBatchesLength),
    );
  } catch {
    /* ignore persistence failures */
  }
}
