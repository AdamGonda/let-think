import { beforeEach, describe, expect, it } from "vitest";
import {
  getStoredMainColumnWidth,
  setStoredMainColumnWidth,
} from "./mainColumnWidthStorage";

describe("mainColumnWidthStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getStoredMainColumnWidth()).toBeNull();
  });

  it("round-trips a stored width", () => {
    setStoredMainColumnWidth(1024);
    expect(getStoredMainColumnWidth()).toBe(1024);
  });

  it("returns null for a corrupted (non-numeric) stored value", () => {
    localStorage.setItem("think-main-column-width", "not-a-number");
    expect(getStoredMainColumnWidth()).toBeNull();
  });
});
