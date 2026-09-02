import { describe, expect, it } from "vitest";
import {
  applyPan,
  applyPinch,
  applyPointerGesture,
  classifyPointerGesture,
  canvasTextStroke,
  CANVAS_MAX_SCALE,
  CANVAS_MIN_SCALE,
  findTextStrokeAt,
  identityViewport,
  isErasePointer,
  isUndoHotkey,
  screenToWorld,
  strokeWidthForPointer,
  textStrokeHits,
  worldToScreen,
} from "./SessionCanvas";

describe("strokeWidthForPointer", () => {
  it("uses the slider size for mouse and touch, and scales pen pressure around it", () => {
    expect(strokeWidthForPointer("mouse", 0.5)).toBe(2);
    expect(strokeWidthForPointer("touch", 1)).toBe(2);
    expect(strokeWidthForPointer("pen", 0)).toBe(2);
    expect(strokeWidthForPointer("pen", 1)).toBe(3);
    expect(strokeWidthForPointer("mouse", 0.5, "draw", 10)).toBe(10);
    expect(strokeWidthForPointer("pen", 1, "draw", 10)).toBe(15);
  });

  it("uses a thicker stroke for the eraser", () => {
    expect(strokeWidthForPointer("mouse", 0.5, "erase")).toBe(40);
    expect(strokeWidthForPointer("mouse", 0.5, "erase", 80)).toBe(80);
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

describe("canvasTextStroke", () => {
  it("keeps trimmed text and font size, and drops empty input", () => {
    expect(canvasTextStroke(12, 24, "  hello  ", 32)).toEqual({
      kind: "text",
      x: 12,
      y: 24,
      text: "hello",
      fontSize: 32,
    });
    expect(canvasTextStroke(0, 0, "   ", 48)).toBeNull();
  });
});

describe("textStrokeHits", () => {
  it("hits inside the measured box and misses outside", () => {
    const stroke = canvasTextStroke(10, 20, "hi", 20);
    expect(stroke).not.toBeNull();
    if (!stroke) return;
    expect(textStrokeHits(stroke, { x: 12, y: 22 }, () => 40)).toBe(true);
    expect(textStrokeHits(stroke, { x: 60, y: 22 }, () => 40)).toBe(false);
    expect(textStrokeHits(stroke, { x: 12, y: 50 }, () => 40)).toBe(false);
  });

  it("falls back to an estimated width when measure returns 0", () => {
    const stroke = canvasTextStroke(0, 0, "hello", 40);
    expect(stroke).not.toBeNull();
    if (!stroke) return;
    expect(textStrokeHits(stroke, { x: 10, y: 10 })).toBe(true);
    expect(findTextStrokeAt([stroke], { x: 10, y: 10 })).toBe(0);
    expect(findTextStrokeAt([stroke], { x: 400, y: 10 })).toBeNull();
  });
});

describe("canvas viewport", () => {
  it("applyPan translates the camera", () => {
    expect(applyPan({ x: 10, y: 20, scale: 2 }, 5, -8)).toEqual({
      x: 15,
      y: 12,
      scale: 2,
    });
  });

  it("screenToWorld inverts worldToScreen", () => {
    const vp = { x: 12, y: -4, scale: 2 };
    const world = { x: 40, y: 9 };
    expect(screenToWorld(vp, worldToScreen(vp, world))).toEqual(world);
  });

  it("applyPinch keeps the world point under the origin", () => {
    const vp = { x: 10, y: 20, scale: 2 };
    const origin = { x: 100, y: 50 };
    const world = screenToWorld(vp, origin);
    const next = applyPinch(vp, origin, 2);
    expect(next.scale).toBe(4);
    expect(worldToScreen(next, world).x).toBeCloseTo(origin.x);
    expect(worldToScreen(next, world).y).toBeCloseTo(origin.y);
  });

  it("applyPinch clamps scale", () => {
    const origin = { x: 10, y: 10 };
    expect(applyPinch(identityViewport(), origin, 0.001).scale).toBe(
      CANVAS_MIN_SCALE,
    );
    expect(
      applyPinch({ x: 0, y: 0, scale: CANVAS_MAX_SCALE }, origin, 4).scale,
    ).toBe(CANVAS_MAX_SCALE);
  });

  it("two pointers pinch around the moving midpoint", () => {
    const prev = new Map([
      [1, { x: 0, y: 0 }],
      [2, { x: 100, y: 0 }],
    ]);
    const next = new Map([
      [1, { x: 0, y: 0 }],
      [2, { x: 200, y: 0 }],
    ]);
    const vp = applyPointerGesture(identityViewport(), prev, next, "pinch");
    expect(vp.scale).toBe(2);
    expect(worldToScreen(vp, { x: 50, y: 0 }).x).toBeCloseTo(100);
    expect(worldToScreen(vp, { x: 50, y: 0 }).y).toBeCloseTo(0);
  });

  it("classifies pinch on two fingers and pan while cmd is held", () => {
    expect(classifyPointerGesture(2, false)).toBe("pinch");
    expect(classifyPointerGesture(1, true)).toBe("pan");
    expect(classifyPointerGesture(2, true)).toBe("pan");
    expect(classifyPointerGesture(3, false)).toBe("none");
    expect(classifyPointerGesture(3, true)).toBe("pan");
  });

  it("pans from a single pointer delta when cmd is held", () => {
    const prev = new Map([[1, { x: 0, y: 0 }]]);
    const next = new Map([[1, { x: 12, y: -4 }]]);
    expect(applyPointerGesture(identityViewport(), prev, next, "pan")).toEqual({
      x: 12,
      y: -4,
      scale: 1,
    });
  });

  it("three pointers pan by the centroid delta", () => {
    const prev = new Map([
      [1, { x: 0, y: 0 }],
      [2, { x: 10, y: 0 }],
      [3, { x: 20, y: 0 }],
    ]);
    const next = new Map([
      [1, { x: 30, y: 0 }],
      [2, { x: 10, y: 0 }],
      [3, { x: 20, y: 0 }],
    ]);
    expect(
      applyPointerGesture(identityViewport(), prev, next, "pan"),
    ).toEqual({
      x: 10,
      y: 0,
      scale: 1,
    });
    expect(
      applyPointerGesture(identityViewport(), prev, next, "pinch").scale,
    ).toBe(1);
  });
});
