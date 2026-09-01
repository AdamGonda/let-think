import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";

type Point = { x: number; y: number };
type StrokePoint = { x: number; y: number; width: number };
type InkKind = "draw" | "erase";
type ShapeKind = "rect" | "ellipse";
type InkStroke = { kind: InkKind; points: StrokePoint[] };
type ShapeStroke = { kind: ShapeKind; from: Point; to: Point; width: number };
type TextStroke = { kind: "text"; x: number; y: number; text: string };
type Stroke = InkStroke | ShapeStroke | TextStroke;

export type CanvasViewport = { x: number; y: number; scale: number };

const INK = "#ffffff";
const MOUSE_WIDTH = 2;
const PEN_MIN_WIDTH = 1.25;
const PEN_PRESSURE_RANGE = 5;
const ERASE_WIDTH_MULTIPLIER = 6;
const ERASE_MIN_WIDTH = 40;
/** Pointer Events: eraser contact is button 5 / buttons bit 5 (32). */
const ERASER_BUTTON = 5;
const ERASER_BUTTONS_MASK = 32;
const CANVAS_TEXT_SIZE = 48;
export const CANVAS_MIN_SCALE = 0.25;
export const CANVAS_MAX_SCALE = 8;
export const CANVAS_TEXT_FONT =
  `${CANVAS_TEXT_SIZE}px "DM Sans", ui-sans-serif, system-ui, sans-serif`;

export function identityViewport(): CanvasViewport {
  return { x: 0, y: 0, scale: 1 };
}

export function screenToWorld(vp: CanvasViewport, screen: Point): Point {
  return {
    x: (screen.x - vp.x) / vp.scale,
    y: (screen.y - vp.y) / vp.scale,
  };
}

export function worldToScreen(vp: CanvasViewport, world: Point): Point {
  return {
    x: world.x * vp.scale + vp.x,
    y: world.y * vp.scale + vp.y,
  };
}

export function applyPan(
  vp: CanvasViewport,
  dx: number,
  dy: number,
): CanvasViewport {
  return { x: vp.x + dx, y: vp.y + dy, scale: vp.scale };
}

export function applyPinch(
  vp: CanvasViewport,
  origin: Point,
  factor: number,
): CanvasViewport {
  const nextScale = Math.min(
    CANVAS_MAX_SCALE,
    Math.max(CANVAS_MIN_SCALE, vp.scale * factor),
  );
  const world = screenToWorld(vp, origin);
  return {
    x: origin.x - world.x * nextScale,
    y: origin.y - world.y * nextScale,
    scale: nextScale,
  };
}

export function strokeWidthForPointer(
  pointerType: string,
  pressure: number,
  kind: InkKind = "draw",
): number {
  const base =
    pointerType !== "pen"
      ? MOUSE_WIDTH
      : PEN_MIN_WIDTH + (pressure > 0 ? pressure : 0.5) * PEN_PRESSURE_RANGE;
  if (kind === "erase") return Math.max(ERASE_MIN_WIDTH, base * ERASE_WIDTH_MULTIPLIER);
  return base;
}

export function isUndoHotkey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.altKey || event.shiftKey) return false;
  if (!event.ctrlKey && !event.metaKey) return false;
  return event.key === "z" || event.key === "Z";
}

export function isErasePointer(event: {
  pointerType: string;
  button: number;
  buttons: number;
}): boolean {
  return (
    event.pointerType === "eraser" ||
    event.button === ERASER_BUTTON ||
    (event.buttons & ERASER_BUTTONS_MASK) === ERASER_BUTTONS_MASK
  );
}

export function rectFromPoints(from: Point, to: Point): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    w: Math.abs(to.x - from.x),
    h: Math.abs(to.y - from.y),
  };
}

export function isEmptyShape(from: Point, to: Point): boolean {
  return Math.abs(to.x - from.x) < 1 && Math.abs(to.y - from.y) < 1;
}

export function canvasTextStroke(
  x: number,
  y: number,
  raw: string,
): TextStroke | null {
  const text = raw.replace(/\u00a0/g, " ").trim();
  if (text === "") return null;
  return { kind: "text", x, y, text };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function isShapeTool(tool: CanvasTool): tool is ShapeKind {
  return tool === "rect" || tool === "ellipse";
}

function drawShape(ctx: CanvasRenderingContext2D, stroke: ShapeStroke): void {
  ctx.lineWidth = stroke.width;
  const { x, y, w, h } = rectFromPoints(stroke.from, stroke.to);
  if (stroke.kind === "rect") {
    ctx.strokeRect(x, y, w, h);
    return;
  }
  const rx = Math.max(w / 2, 0.5);
  const ry = Math.max(h / 2, 0.5);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.kind === "text") {
    ctx.globalCompositeOperation = "source-over";
    setupInk(ctx);
    ctx.font = CANVAS_TEXT_FONT;
    ctx.textBaseline = "top";
    ctx.fillText(stroke.text, stroke.x, stroke.y);
    return;
  }
  if (stroke.kind === "draw" || stroke.kind === "erase") {
    applyKind(ctx, stroke.kind);
    const points = stroke.points;
    if (points.length === 0) return;
    if (points.length === 1) {
      const p = points[0];
      if (!p) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      if (!from || !to) continue;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineWidth = to.width;
      ctx.stroke();
    }
    return;
  }
  if (stroke.kind === "rect" || stroke.kind === "ellipse") {
    ctx.globalCompositeOperation = "source-over";
    setupInk(ctx);
    drawShape(ctx, stroke);
  }
}

function canvasScreenPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent | WheelEvent,
): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function worldPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  vp: CanvasViewport,
): Point {
  return screenToWorld(vp, canvasScreenPoint(canvas, event));
}

function pointFromEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  kind: InkKind,
  vp: CanvasViewport,
): StrokePoint {
  const { x, y } = worldPoint(canvas, event, vp);
  return {
    x,
    y,
    width: strokeWidthForPointer(event.pointerType, event.pressure, kind),
  };
}

function setupInk(ctx: CanvasRenderingContext2D): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
}

function applyKind(ctx: CanvasRenderingContext2D, kind: InkKind): void {
  ctx.globalCompositeOperation = kind === "erase" ? "destination-out" : "source-over";
  setupInk(ctx);
}

function applyCamera(
  ctx: CanvasRenderingContext2D,
  vp: CanvasViewport,
): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(
    dpr * vp.scale,
    0,
    0,
    dpr * vp.scale,
    dpr * vp.x,
    dpr * vp.y,
  );
}

function inkContext(
  canvas: HTMLCanvasElement,
  kind: InkKind,
  vp: CanvasViewport,
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  applyCamera(ctx, vp);
  applyKind(ctx, kind);
  return ctx;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function centroid(points: Iterable<Point>): Point {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    n += 1;
  }
  return { x: x / n, y: y / n };
}

function pairPointers(
  map: ReadonlyMap<number, Point>,
): [Point, Point] | null {
  if (map.size !== 2) return null;
  const points = [...map.values()];
  const a = points[0];
  const b = points[1];
  if (!a || !b) return null;
  return [a, b];
}

export function isPanModifier(
  event: { metaKey: boolean },
  commandHeld = false,
): boolean {
  return event.metaKey || commandHeld;
}

export function classifyPointerGesture(
  pointerCount: number,
  panModifier: boolean,
): "pinch" | "pan" | "none" {
  // macOS 3-finger trackpad drag is one pointer; Cmd is the pan chord.
  if (panModifier && pointerCount >= 1) return "pan";
  if (pointerCount === 2) return "pinch";
  return "none";
}

export function applyPointerGesture(
  vp: CanvasViewport,
  prev: ReadonlyMap<number, Point>,
  next: ReadonlyMap<number, Point>,
  gesture: "pinch" | "pan",
): CanvasViewport {
  if (gesture === "pinch") {
    const before = pairPointers(prev);
    const after = pairPointers(next);
    if (!before || !after) return vp;
    const prevDist = Math.hypot(
      before[0].x - before[1].x,
      before[0].y - before[1].y,
    );
    const nextDist = Math.hypot(
      after[0].x - after[1].x,
      after[0].y - after[1].y,
    );
    const prevMid = midpoint(before[0], before[1]);
    const nextMid = midpoint(after[0], after[1]);
    let nextVp = applyPan(vp, nextMid.x - prevMid.x, nextMid.y - prevMid.y);
    if (prevDist > 0.5) {
      nextVp = applyPinch(nextVp, nextMid, nextDist / prevDist);
    }
    return nextVp;
  }
  if (prev.size < 1 || next.size < 1) return vp;
  const from = centroid(prev.values());
  const to = centroid(next.values());
  return applyPan(vp, to.x - from.x, to.y - from.y);
}

type SessionCanvasProps = {
  active: boolean;
};

export function SessionCanvas({ active }: SessionCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textElRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const drawingPointerIdRef = useRef<number | null>(null);
  const gesturingRef = useRef(false);
  const commandHeldRef = useRef(false);
  const viewportRef = useRef<CanvasViewport>(identityViewport());
  const textDraftRef = useRef<Point | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [textDraft, setTextDraft] = useState<Point | null>(null);
  const [eraseCursor, setEraseCursor] = useState<Point | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(identityViewport);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const redraw = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      applyCamera(ctx, viewportRef.current);
      setupInk(ctx);
      for (const stroke of strokesRef.current) {
        drawStroke(ctx, stroke);
      }
      if (liveStrokeRef.current) {
        drawStroke(ctx, liveStrokeRef.current);
      }
    };

    redrawRef.current = redraw;
    const observer = new ResizeObserver(redraw);
    observer.observe(wrap);
    redraw();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const next = applyPinch(
        viewportRef.current,
        canvasScreenPoint(canvas, event),
        Math.exp(-event.deltaY * 0.01),
      );
      viewportRef.current = next;
      setViewport(next);
      redrawRef.current();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Meta") {
        commandHeldRef.current = true;
        if (pointersRef.current.size > 0) {
          drawingPointerIdRef.current = null;
          if (liveStrokeRef.current) {
            liveStrokeRef.current = null;
            redrawRef.current();
          }
          gesturingRef.current = true;
        }
      }
      if (!isUndoHotkey(event) || isTypingTarget(event.target)) return;
      event.preventDefault();
      const canvas = canvasRef.current;
      const drawingId = drawingPointerIdRef.current;
      if (drawingId != null && canvas?.hasPointerCapture?.(drawingId)) {
        canvas.releasePointerCapture(drawingId);
      }
      drawingPointerIdRef.current = null;
      if (liveStrokeRef.current) {
        liveStrokeRef.current = null;
      } else if (strokesRef.current.length > 0) {
        strokesRef.current = strokesRef.current.slice(0, -1);
      }
      redrawRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Meta") commandHeldRef.current = false;
    };
    const onBlur = () => {
      commandHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      textDraftRef.current = null;
      setTextDraft(null);
    }
  }, [active]);

  useEffect(() => {
    if (!textDraft) return;
    textElRef.current?.focus();
  }, [textDraft]);

  const commitViewport = (next: CanvasViewport) => {
    viewportRef.current = next;
    setViewport(next);
    redrawRef.current();
  };

  const abortLiveStroke = () => {
    drawingPointerIdRef.current = null;
    if (!liveStrokeRef.current) return;
    liveStrokeRef.current = null;
    redrawRef.current();
  };

  const commitTextDraft = () => {
    const draft = textDraftRef.current;
    if (!draft) return;
    const stroke = canvasTextStroke(
      draft.x,
      draft.y,
      textElRef.current?.innerText ?? "",
    );
    textDraftRef.current = null;
    setTextDraft(null);
    if (!stroke) return;
    strokesRef.current.push(stroke);
    redrawRef.current();
  };

  const paintSegment = (
    from: StrokePoint,
    to: StrokePoint,
    kind: InkKind,
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas ? inkContext(canvas, kind, viewportRef.current) : null;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = to.width;
    ctx.stroke();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    const screen = canvasScreenPoint(canvas, event.nativeEvent);
    pointersRef.current.set(event.nativeEvent.pointerId, screen);
    canvas.setPointerCapture?.(event.nativeEvent.pointerId);

    const gesture = classifyPointerGesture(
      pointersRef.current.size,
      isPanModifier(event, commandHeldRef.current),
    );
    if (gesture === "pan" || gesturingRef.current) {
      gesturingRef.current = true;
      abortLiveStroke();
      return;
    }
    if (pointersRef.current.size > 1) return;

    const erase =
      tool === "erase" || isErasePointer(event.nativeEvent);

    if (!erase && tool === "text") {
      if (textDraftRef.current) {
        commitTextDraft();
        return;
      }
      const point = worldPoint(canvas, event.nativeEvent, viewportRef.current);
      textDraftRef.current = point;
      setTextDraft(point);
      return;
    }

    drawingPointerIdRef.current = event.nativeEvent.pointerId;

    if (erase) {
      trackEraseCursor(event.nativeEvent);
      const point = pointFromEvent(
        canvas,
        event.nativeEvent,
        "erase",
        viewportRef.current,
      );
      liveStrokeRef.current = { kind: "erase", points: [point] };
      const ctx = inkContext(canvas, "erase", viewportRef.current);
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (isShapeTool(tool)) {
      const from = worldPoint(canvas, event.nativeEvent, viewportRef.current);
      liveStrokeRef.current = {
        kind: tool,
        from,
        to: from,
        width: strokeWidthForPointer(
          event.nativeEvent.pointerType,
          event.nativeEvent.pressure,
        ),
      };
      redrawRef.current();
      return;
    }

    const point = pointFromEvent(
      canvas,
      event.nativeEvent,
      "draw",
      viewportRef.current,
    );
    liveStrokeRef.current = { kind: "draw", points: [point] };
    const ctx = inkContext(canvas, "draw", viewportRef.current);
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const trackEraseCursor = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || tool !== "erase") return;
    setEraseCursor(worldPoint(canvas, event, viewportRef.current));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    trackEraseCursor(event.nativeEvent);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const id = event.nativeEvent.pointerId;
    const prev = new Map(pointersRef.current);
    if (pointersRef.current.has(id)) {
      pointersRef.current.set(id, canvasScreenPoint(canvas, event.nativeEvent));
    }

    const gesture = classifyPointerGesture(
      pointersRef.current.size,
      isPanModifier(event, commandHeldRef.current),
    );
    if (gesture !== "none") {
      if (!gesturingRef.current) abortLiveStroke();
      gesturingRef.current = true;
      event.preventDefault();
      commitViewport(
        applyPointerGesture(
          viewportRef.current,
          prev,
          pointersRef.current,
          gesture,
        ),
      );
      return;
    }

    if (drawingPointerIdRef.current !== id) return;
    const stroke = liveStrokeRef.current;
    if (!stroke) return;
    event.preventDefault();
    if (stroke.kind === "rect" || stroke.kind === "ellipse") {
      stroke.to = worldPoint(canvas, event.nativeEvent, viewportRef.current);
      redrawRef.current();
      return;
    }
    if (stroke.kind !== "draw" && stroke.kind !== "erase") return;
    const coalesced =
      event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const raw of coalesced) {
      const point = pointFromEvent(
        canvas,
        raw,
        stroke.kind,
        viewportRef.current,
      );
      const prevPoint = stroke.points[stroke.points.length - 1];
      stroke.points.push(point);
      if (prevPoint) paintSegment(prevPoint, point, stroke.kind);
    }
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const id = event.nativeEvent.pointerId;
    if (canvas?.hasPointerCapture?.(id)) {
      canvas.releasePointerCapture(id);
    }
    pointersRef.current.delete(id);
    if (pointersRef.current.size === 0) gesturingRef.current = false;
    if (drawingPointerIdRef.current !== id) return;
    drawingPointerIdRef.current = null;
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (!stroke) return;
    if (stroke.kind === "draw" || stroke.kind === "erase") {
      if (stroke.points.length > 0) strokesRef.current.push(stroke);
      return;
    }
    if (
      (stroke.kind === "rect" || stroke.kind === "ellipse") &&
      !isEmptyShape(stroke.from, stroke.to)
    ) {
      strokesRef.current.push(stroke);
    }
    redrawRef.current();
  };

  const cursorClass =
    tool === "text"
      ? "cursor-text"
      : tool === "erase"
        ? "cursor-none"
        : "cursor-crosshair";
  const eraseSize = strokeWidthForPointer("mouse", 0.5, "erase") * viewport.scale;
  const eraseScreen = eraseCursor ? worldToScreen(viewport, eraseCursor) : null;
  const textScreen = textDraft ? worldToScreen(viewport, textDraft) : null;

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full touch-none ${cursorClass}`}
        aria-label="Drawing canvas"
        data-viewport-x={viewport.x}
        data-viewport-scale={viewport.scale}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerEnter={(event) => trackEraseCursor(event.nativeEvent)}
        onPointerLeave={() => {
          if (pointersRef.current.size === 0) setEraseCursor(null);
        }}
        onContextMenu={(event) => event.preventDefault()}
      />
      {tool === "erase" && eraseScreen ? (
        <div
          data-testid="erase-radius"
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-full border border-white/70"
          style={{
            width: eraseSize,
            height: eraseSize,
            left: eraseScreen.x,
            top: eraseScreen.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
      <CanvasToolbar
        tool={tool}
        onToolChange={(next) => {
          if (textDraftRef.current) commitTextDraft();
          setEraseCursor(null);
          setTool(next);
        }}
      />
      {textDraft && textScreen ? (
        <div
          ref={textElRef}
          role="textbox"
          aria-label="Canvas text"
          contentEditable
          suppressContentEditableWarning
          className="absolute z-10 min-w-[1ch] bg-transparent text-white outline-none"
          style={{
            left: textScreen.x,
            top: textScreen.y,
            font: `${CANVAS_TEXT_SIZE * viewport.scale}px "DM Sans", ui-sans-serif, system-ui, sans-serif`,
            caretColor: INK,
            whiteSpace: "pre",
            lineHeight: 1.2,
            minHeight: "1.2em",
          }}
          onBlur={commitTextDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTextDraft();
            } else if (event.key === "Escape") {
              event.preventDefault();
              textDraftRef.current = null;
              setTextDraft(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
