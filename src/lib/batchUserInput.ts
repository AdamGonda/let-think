import type { SessionMessage } from "@/contexts/SessionDataContext";

type BatchWithDescription = {
  description?: string;
  nodeIds?: string[];
};

function normalizeForMatch(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function resolveUserMessageIndexForBatch(
  batches: BatchWithDescription[],
  messages: SessionMessage[] | undefined,
  batchIndex: number,
): number | null {
  if (batchIndex < 0 || batchIndex >= batches.length) return null;
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
      if (b === batchIndex) return idx;
      used.add(idx);
    }
  }

  return batchIndex < userMessages.length ? batchIndex : null;
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
  const direct = batches[batchIndex]?.description?.trim();
  const idx = resolveUserMessageIndexForBatch(batches, messages, batchIndex);
  if (idx == null) return direct ?? "";
  const userMessages = (messages ?? []).filter((m) => m.role === "user");
  return userMessages[idx]?.content ?? direct ?? "";
}

/**
 * User message row for a batch (for mention pills + resolved content), or null.
 */
/**
 * Chronological index among user-only messages (oldest = 0) for the user message
 * that {@link userMessageForBatch} resolves for this batch — same mapping the graph uses.
 */
export function userMessageChronoIndexForBatch(
  batches: BatchWithDescription[],
  messages: SessionMessage[] | undefined,
  batchIndex: number,
): number | null {
  return resolveUserMessageIndexForBatch(batches, messages, batchIndex);
}

export function userMessageForBatch(
  batches: BatchWithDescription[],
  messages: SessionMessage[] | undefined,
  batchIndex: number,
): SessionMessage | null {
  const userMessages = (messages ?? []).filter((m) => m.role === "user");
  const idx = resolveUserMessageIndexForBatch(batches, messages, batchIndex);
  return idx == null ? null : userMessages[idx] ?? null;
}
