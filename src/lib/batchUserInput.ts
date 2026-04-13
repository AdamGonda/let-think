import type { SessionMessage } from "@/contexts/SessionDataContext";

type BatchWithDescription = {
  description?: string;
};

function normalizeForMatch(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Resolves the user prompt for a graph batch: prefers persisted `description`,
 * then matches a user message the same way as the history panel, then falls back
 * to chronological user message order.
 */
export function userInputForBatch(
  batches: BatchWithDescription[],
  messages: SessionMessage[] | undefined,
  batchIndex: number,
): string {
  if (batchIndex < 0 || batchIndex >= batches.length) return "";
  const direct = batches[batchIndex]?.description?.trim();
  if (direct) return direct;

  const userMessages = (messages ?? []).filter((m) => m.role === "user");
  const used = new Set<number>();

  for (let b = 0; b < batches.length; b++) {
    const raw = batches[b]?.description;
    if (!raw) continue;
    const norm = normalizeForMatch(raw);
    if (!norm) continue;
    const idx = userMessages.findIndex(
      (m, i) => !used.has(i) && normalizeForMatch(m.content) === norm,
    );
    if (idx >= 0) {
      if (b === batchIndex) return userMessages[idx]!.content;
      used.add(idx);
    }
  }

  return userMessages[batchIndex]?.content ?? "";
}
