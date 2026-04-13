import { BREAK_MS, RESTRICT_INTERACTION_LIMIT } from "./constants";

/** Mirrors previous `pickRandomLimit` — fixed limit for now. */
export function pickInteractionLimit(): number {
  return RESTRICT_INTERACTION_LIMIT;
}

export type NewUserThinkRow = {
  limit: number;
  used: number;
  breakEndsAt: number | undefined;
  createdAt: number;
};

/** First interaction row when user had no prior restrict row. */
export function newRowAfterFirstInteraction(
  now: number,
  limit: number,
): NewUserThinkRow {
  return {
    limit,
    used: 1,
    breakEndsAt: limit === 1 ? now + BREAK_MS : undefined,
    createdAt: now,
  };
}

/** Patch fields after incrementing `used` on an existing restrict row. */
export function patchAfterRecordInteraction(
  existing: { used: number; limit: number; breakEndsAt?: number },
  now: number,
): { used: number; breakEndsAt: number | undefined } {
  const used = existing.used + 1;
  const breakEndsAt =
    used >= existing.limit && !existing.breakEndsAt
      ? now + BREAK_MS
      : existing.breakEndsAt;
  return { used, breakEndsAt };
}

/** Whether optimistic break should set `breakEndsAt` (one interaction before limit). */
export function shouldSetBreakOptimistically(
  existing: { used: number; limit: number; breakEndsAt?: number },
): boolean {
  return existing.used >= existing.limit - 1 && !existing.breakEndsAt;
}
