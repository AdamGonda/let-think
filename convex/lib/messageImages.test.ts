import { describe, expect, it } from "vitest";
import {
  imageIdsForPrompt,
  toModelMessagesWithImages,
  userTextForModel,
} from "./messageImages";
import { EMPTY_IMAGE_USER_CONTENT } from "../constants";

describe("imageIdsForPrompt", () => {
  it("takes current-turn ids first, then newest history", () => {
    const history = [
      { role: "user", content: "a", imageStorageIds: ["old1", "old2"] },
      { role: "assistant", content: "ok" },
      { role: "user", content: "b", imageStorageIds: ["mid"] },
    ];
    expect([...imageIdsForPrompt(history, ["now"], 3)]).toEqual([
      "now",
      "mid",
      "old1",
    ]);
  });

  it("dedupes and stops at max", () => {
    const history = [
      { role: "user", content: "a", imageStorageIds: ["x", "y"] },
    ];
    expect([...imageIdsForPrompt(history, ["x", "z"], 2)]).toEqual(["x", "z"]);
  });
});

describe("userTextForModel", () => {
  it("keeps real text and fills a fallback when only images exist", () => {
    expect(userTextForModel("  hi  ", false)).toBe("hi");
    expect(userTextForModel("  ", true)).toBe(EMPTY_IMAGE_USER_CONTENT);
    expect(userTextForModel("", false)).toBe("");
  });
});

describe("toModelMessagesWithImages", () => {
  it("inlines included user images as parts", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const images = new Map([
      ["img1", { bytes, mediaType: "image/jpeg" }],
    ]);
    const out = toModelMessagesWithImages(
      [
        { role: "user", content: "look", imageStorageIds: ["img1"] },
        { role: "assistant", content: "ok" },
      ],
      images,
      new Set(["img1"]),
    );
    expect(out[0]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "look" },
        { type: "image", image: bytes, mediaType: "image/jpeg" },
      ],
    });
    expect(out[1]).toEqual({ role: "assistant", content: "ok" });
  });

  it("omits images not in the include set", () => {
    const bytes = new Uint8Array([1]);
    const out = toModelMessagesWithImages(
      [{ role: "user", content: "old", imageStorageIds: ["skip"] }],
      new Map([["skip", { bytes, mediaType: "image/jpeg" }]]),
      new Set(),
    );
    expect(out[0]).toEqual({ role: "user", content: "old" });
  });
});
