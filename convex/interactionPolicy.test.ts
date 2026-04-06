import { describe, expect, it } from "vitest";
import { BREAK_MS, RESTRICT_INTERACTION_LIMIT } from "./constants";
import {
  newRowAfterFirstInteraction,
  patchAfterRecordInteraction,
  pickInteractionLimit,
  shouldSetBreakOptimistically,
} from "./interactionPolicy";

describe("interactionPolicy", () => {
  it("pickInteractionLimit matches constant", () => {
    expect(pickInteractionLimit()).toBe(RESTRICT_INTERACTION_LIMIT);
  });

  it("newRowAfterFirstInteraction sets break when limit is 1", () => {
    const now = 1_000;
    const row = newRowAfterFirstInteraction(now, 1);
    expect(row.used).toBe(1);
    expect(row.breakEndsAt).toBe(now + BREAK_MS);
  });

  it("patchAfterRecordInteraction sets break when used reaches limit", () => {
    const now = 5_000;
    const out = patchAfterRecordInteraction(
      { used: 2, limit: 3, breakEndsAt: undefined },
      now,
    );
    expect(out.used).toBe(3);
    expect(out.breakEndsAt).toBe(now + BREAK_MS);
  });

  it("shouldSetBreakOptimistically when one away from limit", () => {
    expect(
      shouldSetBreakOptimistically({ used: 2, limit: 3, breakEndsAt: undefined }),
    ).toBe(true);
    expect(
      shouldSetBreakOptimistically({
        used: 2,
        limit: 3,
        breakEndsAt: 100,
      }),
    ).toBe(false);
  });
});
