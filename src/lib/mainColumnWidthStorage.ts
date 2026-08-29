const STORAGE_KEY_MAIN_COLUMN_WIDTH = "think-main-column-width";

export function getStoredMainColumnWidth(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MAIN_COLUMN_WIDTH);
    if (stored === null) return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredMainColumnWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_MAIN_COLUMN_WIDTH, String(width));
  } catch {
    /* ignore persistence failures */
  }
}
