const STORAGE_PREFIX = "think-heading-folds:";

export function getStoredHeadingFolds(documentId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + documentId);
    if (raw == null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === "string");
  } catch {
    return [];
  }
}

export function setStoredHeadingFolds(
  documentId: string,
  keys: readonly string[],
): void {
  try {
    const storageKey = STORAGE_PREFIX + documentId;
    if (keys.length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore persistence failures */
  }
}
