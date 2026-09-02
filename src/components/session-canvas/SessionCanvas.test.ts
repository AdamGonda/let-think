import { describe, expect, it } from "vitest";
import {
  applyPan,
  applyPinch,
  applyPointerGesture,
  classifyPointerGesture,
  canvasTextStroke,
  CANVAS_MAX_SCALE,
  CANVAS_MIN_SCALE,
  estimatedTextWidth,
  findTextStrokeAt,
  identityViewport,
  isEmptyShape,
  isErasePointer,
  isUndoHotkey,
  moveWorldByScreenDelta,
  rectFromPoints,
  screenToWorld,
  strokeBounds,
  strokesHaveInk,
  strokeWidthForPointer,
  textStrokeHits,
  worldToScreen,
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

describe("text stroke hit testing", () => {
  const hello = { kind: "text" as const, x: 12, y: 24, text: "hello" };

  it("hits inside the estimated glyph box and misses outside", () => {
    const width = estimatedTextWidth("hello");
    expect(textStrokeHits(hello, { x: 12, y: 24 })).toBe(true);
    expect(textStrokeHits(hello, { x: 12 + width, y: 24 })).toBe(true);
    expect(textStrokeHits(hello, { x: 11, y: 24 })).toBe(false);
    expect(textStrokeHits(hello, { x: 12, y: 23 })).toBe(false);
  });

  it("prefers later text strokes and skips ink", () => {
    const strokes = [
      { kind: "draw" as const, points: [{ x: 12, y: 24, width: 2 }] },
      hello,
      { kind: "text" as const, x: 12, y: 24, text: "on top" },
    ];
    expect(findTextStrokeAt(strokes, { x: 13, y: 25 })).toBe(2);
    expect(findTextStrokeAt(strokes, { x: 0, y: 0 })).toBeNull();
  });
});

describe("moveWorldByScreenDelta", () => {
  it("converts a screen drag into world space", () => {
    expect(moveWorldByScreenDelta({ x: 20, y: 20 }, 30, 10, 1)).toEqual({
      x: 50,
      y: 30,
    });
    expect(moveWorldByScreenDelta({ x: 20, y: 20 }, 30, 10, 2)).toEqual({
      x: 35,
      y: 25,
    });
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

describe("canvas snapshot bounds", () => {
  it("treats only non-erase strokes as ink", () => {
    expect(
      strokesHaveInk([{ kind: "erase", points: [{ x: 0, y: 0, width: 8 }] }]),
    ).toBe(false);
    expect(
      strokesHaveInk([{ kind: "draw", points: [{ x: 0, y: 0, width: 2 }] }]),
    ).toBe(true);
  });

  it("pads the bounding box around ink", () => {
    const bounds = strokeBounds([
      { kind: "draw", points: [{ x: 10, y: 20, width: 2 }] },
    ]);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(10 - 1 - 32);
    expect(bounds!.y).toBe(20 - 1 - 32);
    expect(bounds!.w).toBeGreaterThan(1);
    expect(bounds!.h).toBeGreaterThan(1);
  });

  it("returns null for empty strokes", () => {
    expect(strokeBounds([])).toBeNull();
  });
});
