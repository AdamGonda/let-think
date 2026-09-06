import { beforeEach, describe, expect, it } from "vitest";
import {
  getStoredHeadingFolds,
  setStoredHeadingFolds,
} from "./headingFoldStorage";

describe("headingFoldStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty when nothing is stored", () => {
    expect(getStoredHeadingFolds("file-1")).toEqual([]);
  });

  it("round-trips folded heading keys per document", () => {
    setStoredHeadingFolds("file-1", ["0:# One", "1:# One"]);
    setStoredHeadingFolds("file-2", ["0:# Other"]);
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "1:# One"]);
    expect(getStoredHeadingFolds("file-2")).toEqual(["0:# Other"]);
  });

  it("clears storage when no headings are folded", () => {
    setStoredHeadingFolds("file-1", ["0:# One"]);
    setStoredHeadingFolds("file-1", []);
    expect(getStoredHeadingFolds("file-1")).toEqual([]);
    expect(localStorage.getItem("think-heading-folds:file-1")).toBeNull();
  });

  it("returns empty for corrupted stored values", () => {
    localStorage.setItem("think-heading-folds:file-1", "{not-json");
    expect(getStoredHeadingFolds("file-1")).toEqual([]);
    localStorage.setItem("think-heading-folds:file-1", '{"nope":true}');
    expect(getStoredHeadingFolds("file-1")).toEqual([]);
    localStorage.setItem("think-heading-folds:file-1", '[1, "0:# One"]');
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One"]);
  });
});
