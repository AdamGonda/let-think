import { describe, expect, it } from "vitest";
import {
  imageFilesToAdd,
  isAcceptedImageType,
} from "./imageAttach";

describe("isAcceptedImageType", () => {
  it("allows jpeg/png/webp/gif only", () => {
    expect(isAcceptedImageType("image/jpeg")).toBe(true);
    expect(isAcceptedImageType("image/png")).toBe(true);
    expect(isAcceptedImageType("image/webp")).toBe(true);
    expect(isAcceptedImageType("image/gif")).toBe(true);
    expect(isAcceptedImageType("image/heic")).toBe(false);
    expect(isAcceptedImageType("application/pdf")).toBe(false);
  });
});

describe("imageFilesToAdd", () => {
  const jpeg = (name: string) =>
    new File(["x"], name, { type: "image/jpeg" });

  it("filters types and respects remaining slots", () => {
    const files = [
      jpeg("a.jpg"),
      new File(["x"], "skip.pdf", { type: "application/pdf" }),
      jpeg("b.jpg"),
      jpeg("c.jpg"),
    ];
    expect(imageFilesToAdd(files, 2, 4).map((f) => f.name)).toEqual([
      "a.jpg",
      "b.jpg",
    ]);
  });
});
