import { describe, expect, it } from "vitest";
import {
  canvasTextStroke,
  isEmptyShape,
  isErasePointer,
  isUndoHotkey,
  rectFromPoints,
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
    expect(strokeWidthForPointer("mouse", 0.5, "erase")).toBe(40);
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

describe("rectFromPoints", () => {
  it("normalizes a dragged rectangle regardless of drag direction", () => {
    expect(rectFromPoints({ x: 10, y: 40 }, { x: 4, y: 8 })).toEqual({
      x: 4,
      y: 8,
      w: 6,
      h: 32,
    });
  });
});

describe("isEmptyShape", () => {
  it("treats sub-pixel drags as empty", () => {
    expect(isEmptyShape({ x: 1, y: 1 }, { x: 1.2, y: 1.4 })).toBe(true);
    expect(isEmptyShape({ x: 0, y: 0 }, { x: 8, y: 0 })).toBe(false);
  });
});

describe("canvasTextStroke", () => {
  it("bakes trimmed text and drops empty input", () => {
    expect(canvasTextStroke(12, 24, "  hello  ")).toEqual({
      kind: "text",
      x: 12,
      y: 24,
      text: "hello",
    });
    expect(canvasTextStroke(0, 0, "   ")).toBeNull();
  });
});
