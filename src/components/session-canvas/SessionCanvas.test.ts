import { describe, expect, it } from "vitest";
import {
  applyPan,
  applyPinch,
  applyPointerGesture,
  classifyPointerGesture,
  canvasTextStroke,
  CANVAS_MAX_SCALE,
  CANVAS_MIN_SCALE,
  clearStrokeHistory,
  cloneStrokes,
  findTextStrokeAt,
  identityViewport,
  inkOverChrome,
  isErasePointer,
  isRedoHotkey,
  isSmoothedPointer,
  isTypingTarget,
  isUndoHotkey,
  moveWorldByScreenDelta,
  PEN_POS_SMOOTH,
  PEN_WIDTH_SMOOTH,
  pushStrokeHistory,
  redoStrokeHistory,
  screenToWorld,
  smoothInkPoint,
  strokeBounds,
  strokesHaveInk,
  strokeWidthForPointer,
  layeredStrokeOrder,
  textStrokeHits,
  scaleFontSize,
  estimatedTextWidth,
  undoStrokeHistory,
  worldToScreen,
  type Stroke,
} from "./SessionCanvas";

describe("strokeWidthForPointer", () => {
  it("uses the slider size for mouse and touch", () => {
    expect(strokeWidthForPointer("mouse", 0.5)).toBe(4);
    expect(strokeWidthForPointer("touch", 1)).toBe(4);
    expect(strokeWidthForPointer("mouse", 0.5, "draw", 10)).toBe(10);
  });

  it("maps light pen pressure to a hairline and firm press to the slider", () => {
    expect(strokeWidthForPointer("pen", 0)).toBe(0.5);
    expect(strokeWidthForPointer("pen", 0.04, "draw", 10)).toBe(1.2);
    expect(strokeWidthForPointer("pen", 0)).toBeLessThan(4);
    expect(strokeWidthForPointer("pen", 0.75)).toBe(4);
    expect(strokeWidthForPointer("pen", 1, "draw", 10)).toBe(10);
    expect(strokeWidthForPointer("pen", 1, "draw", 10)).not.toBe(15);
  });

  it("uses a thicker stroke for the eraser", () => {
    expect(strokeWidthForPointer("mouse", 0.5, "erase")).toBe(40);
    expect(strokeWidthForPointer("mouse", 0.5, "erase", 80)).toBe(80);
    expect(strokeWidthForPointer("pen", 1, "erase")).toBeGreaterThan(
      strokeWidthForPointer("pen", 1, "draw"),
    );
  });
});

describe("smoothInkPoint", () => {
  const prev = { x: 0, y: 0, width: 2 };

  it("keeps the first point and chrome gap points raw", () => {
    const next = { x: 10, y: 20, width: 8 };
    expect(smoothInkPoint(null, next)).toEqual(next);
    expect(smoothInkPoint(undefined, next)).toEqual(next);
    const gap = { x: 10, y: 20, width: 8, gap: true as const };
    expect(smoothInkPoint(prev, gap)).toEqual(gap);
  });

  it("lerps position and damps a width spike toward the previous sample", () => {
    const next = { x: 10, y: 20, width: 12 };
    const out = smoothInkPoint(prev, next);
    expect(out.x).toBe(0 + (10 - 0) * PEN_POS_SMOOTH);
    expect(out.y).toBe(0 + (20 - 0) * PEN_POS_SMOOTH);
    expect(out.width).toBe(2 + (12 - 2) * PEN_WIDTH_SMOOTH);
    expect(out.x).toBeGreaterThan(prev.x);
    expect(out.x).toBeLessThan(next.x);
    expect(out.width).toBeGreaterThan(prev.width);
    expect(out.width).toBeLessThan(next.width);
  });
});

describe("isSmoothedPointer", () => {
  it("smooths pen and eraser, not mouse or touch", () => {
    expect(isSmoothedPointer("pen")).toBe(true);
    expect(isSmoothedPointer("eraser")).toBe(true);
    expect(isSmoothedPointer("mouse")).toBe(false);
    expect(isSmoothedPointer("touch")).toBe(false);
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

describe("isRedoHotkey", () => {
  it("matches ctrl/cmd+shift+z and ctrl+y", () => {
    expect(
      isRedoHotkey({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      isRedoHotkey({
        key: "z",
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      isRedoHotkey({
        key: "y",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      isRedoHotkey({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(false);
    expect(
      isRedoHotkey({
        key: "y",
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("blocks text entry but allows the size slider", () => {
    const range = document.createElement("input");
    range.type = "range";
    expect(isTypingTarget(range)).toBe(false);

    const text = document.createElement("input");
    text.type = "text";
    expect(isTypingTarget(text)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(isTypingTarget(textarea)).toBe(true);

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    expect(isTypingTarget(editable)).toBe(true);

    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("stroke history", () => {
  const ink = (n: number): Stroke => ({
    kind: "draw",
    points: [{ x: n, y: n, width: 2 }],
    color: "#fff",
  });
  const label = (x: number, y: number): Stroke => ({
    kind: "text",
    x,
    y,
    text: "hi",
    fontSize: 24,
    color: "#fff",
  });

  it("undo restores the prior snapshot and redo re-applies", () => {
    const past: Stroke[][] = [];
    const future: Stroke[][] = [];
    let strokes: Stroke[] = [ink(1)];

    pushStrokeHistory(past, future, strokes);
    strokes = [...strokes, ink(2)];
    expect(strokes).toHaveLength(2);

    const undone = undoStrokeHistory(past, future, strokes);
    expect(undone).toEqual([ink(1)]);
    strokes = undone!;

    const redone = redoStrokeHistory(past, future, strokes);
    expect(redone).toEqual([ink(1), ink(2)]);
  });

  it("a new action clears the redo stack", () => {
    const past: Stroke[][] = [];
    const future: Stroke[][] = [];
    let strokes: Stroke[] = [ink(1)];

    pushStrokeHistory(past, future, strokes);
    strokes = [...strokes, ink(2)];
    strokes = undoStrokeHistory(past, future, strokes)!;
    expect(future).toHaveLength(1);

    pushStrokeHistory(past, future, strokes);
    strokes = [...strokes, ink(3)];
    expect(future).toHaveLength(0);
    expect(redoStrokeHistory(past, future, strokes)).toBeNull();
  });

  it("treats an in-place text move as one undo step", () => {
    const past: Stroke[][] = [];
    const future: Stroke[][] = [];
    let strokes: Stroke[] = [label(10, 10)];

    pushStrokeHistory(past, future, strokes);
    strokes = [{ ...strokes[0]!, x: 40, y: 50 } as Stroke];
    strokes = [{ ...strokes[0]!, x: 80, y: 90 } as Stroke];

    const restored = undoStrokeHistory(past, future, strokes);
    expect(restored).toEqual([label(10, 10)]);
  });

  it("cloneStrokes deep-copies so later mutations do not rewrite history", () => {
    const original: Stroke[] = [ink(1)];
    const cloned = cloneStrokes(original);
    if (cloned[0]?.kind === "draw") cloned[0].points[0]!.x = 99;
    expect(original[0]).toEqual(ink(1));
  });

  it("clearStrokeHistory empties both stacks", () => {
    const past: Stroke[][] = [[ink(1)]];
    const future: Stroke[][] = [[ink(2)]];
    clearStrokeHistory(past, future);
    expect(past).toEqual([]);
    expect(future).toEqual([]);
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
      color: "#ffffff",
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

describe("scaleFontSize", () => {
  it("scales from the drag distance and clamps to the text size range", () => {
    expect(scaleFontSize(48, 10, 20)).toBe(96);
    expect(scaleFontSize(48, 10, 2)).toBe(12);
    expect(scaleFontSize(48, 10, 100)).toBe(128);
    expect(scaleFontSize(48, 0, 20)).toBe(48);
  });
});

describe("moveWorldByScreenDelta", () => {
  it("divides screen delta by scale", () => {
    expect(moveWorldByScreenDelta({ x: 10, y: 20 }, 8, -4, 2)).toEqual({
      x: 14,
      y: 18,
    });
    expect(moveWorldByScreenDelta({ x: 0, y: 0 }, 10, 5, 1)).toEqual({
      x: 10,
      y: 5,
    });
  });
});

describe("inkOverChrome", () => {
  it("rejects points over chrome and reconnects after a gap", () => {
    expect(inkOverChrome(true)).toEqual({ accept: false, broken: true });
    expect(inkOverChrome(false)).toEqual({ accept: true, broken: false });
  });
});

describe("text stroke hit testing", () => {
  const hello = {
    kind: "text" as const,
    x: 12,
    y: 24,
    text: "hello",
    fontSize: 48,
    color: "#ffffff",
  };

  it("hits inside the estimated glyph box and misses outside", () => {
    const width = estimatedTextWidth("hello", hello.fontSize);
    expect(textStrokeHits(hello, { x: 12, y: 24 })).toBe(true);
    expect(textStrokeHits(hello, { x: 12 + width, y: 24 })).toBe(true);
    expect(textStrokeHits(hello, { x: 11, y: 24 })).toBe(false);
    expect(textStrokeHits(hello, { x: 12, y: 23 })).toBe(false);
  });

  it("prefers later text strokes and skips ink", () => {
    const strokes = [
      { kind: "draw" as const, points: [{ x: 12, y: 24, width: 2 }] },
      hello,
      { kind: "text" as const, x: 12, y: 24, text: "on top", fontSize: 48, color: "#ffffff" },
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

  it("draws all text after ink so erase cannot punch labels", () => {
    expect(
      layeredStrokeOrder([
        {
          kind: "text",
          x: 0,
          y: 0,
          text: "a",
          fontSize: 12,
          color: "#fff",
        },
        { kind: "erase", points: [{ x: 0, y: 0, width: 8 }] },
        { kind: "draw", points: [{ x: 1, y: 1, width: 2 }] },
      ]).map((s) => s.kind),
    ).toEqual(["erase", "draw", "text"]);
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
