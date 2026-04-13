import { describe, expect, it } from "vitest";
import { nextBatchIndexAfterLengthChange } from "./batchIndexFromLengthChange";

describe("nextBatchIndexAfterLengthChange", () => {
  it("keeps current index when new length is 0", () => {
    expect(
      nextBatchIndexAfterLengthChange({
        prevLength: 3,
        newLength: 0,
        currentIndex: 2,
      }),
    ).toBe(2);
  });

  it("selects last batch when length grows", () => {
    expect(
      nextBatchIndexAfterLengthChange({
        prevLength: 2,
        newLength: 3,
        currentIndex: 0,
      }),
    ).toBe(2);
  });

  it("clamps index when length shrinks", () => {
    expect(
      nextBatchIndexAfterLengthChange({
        prevLength: 5,
        newLength: 2,
        currentIndex: 4,
      }),
    ).toBe(1);
  });
});
