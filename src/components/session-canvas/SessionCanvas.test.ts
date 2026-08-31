import { describe, expect, it } from "vitest";
import {
  isErasePointer,
  isUndoHotkey,
  strokeWidthForPointer,
} from "./SessionCanvas";

describe("strokeWidthForPointer", () => {
  it("keeps mouse and touch thin, and scales pen pressure", () => {
    expect(strokeWidthForPointer("mouse", 0.5)).toBe(2);
    expect(strokeWidthForPointer("touch", 1)).toBe(2);
    expect(strokeWidthForPointer("pen", 0)).toBe(1.25 + 0.5 * 5);
    expect(strokeWidthForPointer("pen", 1)).toBe(1.25 + 5);
  });

  it("uses a thicker stroke for the eraser", () => {
    expect(strokeWidthForPointer("mouse", 0.5, "erase")).toBe(12);
    expect(strokeWidthForPointer("pen", 1, "erase")).toBeGreaterThan(
      strokeWidthForPointer("pen", 1, "draw"),
    );
  });
});

describe("isUndoHotkey", () => {
  it("matches ctrl/cmd+z without shift or alt", () => {
    expect(
      isUndoHotkey({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      isUndoHotkey({
        key: "z",
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      isUndoHotkey({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe(false);
    expect(
      isUndoHotkey({
        key: "z",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });
});

describe("isErasePointer", () => {
  it("treats the stylus eraser contact as erase", () => {
    expect(
      isErasePointer({ pointerType: "eraser", button: 0, buttons: 1 }),
    ).toBe(true);
    expect(
      isErasePointer({ pointerType: "pen", button: 5, buttons: 32 }),
    ).toBe(true);
    expect(
      isErasePointer({ pointerType: "pen", button: 0, buttons: 1 }),
    ).toBe(false);
  });
});
