import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

type StrokeKind = "draw" | "erase";
type StrokePoint = { x: number; y: number; width: number };
type Stroke = { kind: StrokeKind; points: StrokePoint[] };

const INK = "#ffffff";
const MOUSE_WIDTH = 2;
const PEN_MIN_WIDTH = 1.25;
const PEN_PRESSURE_RANGE = 5;
const ERASE_WIDTH_MULTIPLIER = 6;
const ERASE_MIN_WIDTH = 12;
/** Pointer Events: eraser contact is button 5 / buttons bit 5 (32). */
const ERASER_BUTTON = 5;
const ERASER_BUTTONS_MASK = 32;

export function strokeWidthForPointer(
  pointerType: string,
  pressure: number,
  kind: StrokeKind = "draw",
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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
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
}

function pointFromEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  kind: StrokeKind,
): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: strokeWidthForPointer(event.pointerType, event.pressure, kind),
  };
}

function setupInk(ctx: CanvasRenderingContext2D): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
}

function applyKind(ctx: CanvasRenderingContext2D, kind: StrokeKind): void {
  ctx.globalCompositeOperation = kind === "erase" ? "destination-out" : "source-over";
  setupInk(ctx);
}

function inkContext(
  canvas: HTMLCanvasElement,
  kind: StrokeKind,
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  applyKind(ctx, kind);
  return ctx;
}

type SessionCanvasProps = {
  active: boolean;
  eraseMode: boolean;
};

export function SessionCanvas({ active, eraseMode }: SessionCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const eraseModeRef = useRef(eraseMode);
  const redrawRef = useRef<() => void>(() => {});
  eraseModeRef.current = eraseMode;

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, rect.width, rect.height);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isUndoHotkey(event) || isTypingTarget(event.target)) return;
      event.preventDefault();
      const canvas = canvasRef.current;
      if (
        pointerIdRef.current != null &&
        canvas?.hasPointerCapture(pointerIdRef.current)
      ) {
        canvas.releasePointerCapture(pointerIdRef.current);
      }
      pointerIdRef.current = null;
      if (liveStrokeRef.current) {
        liveStrokeRef.current = null;
      } else if (strokesRef.current.length > 0) {
        strokesRef.current = strokesRef.current.slice(0, -1);
      }
      redrawRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const paintSegment = (
    from: StrokePoint,
    to: StrokePoint,
    kind: StrokeKind,
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas ? inkContext(canvas, kind) : null;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = to.width;
    ctx.stroke();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current != null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    canvas.setPointerCapture(event.nativeEvent.pointerId);
    pointerIdRef.current = event.nativeEvent.pointerId;
    const kind: StrokeKind =
      eraseModeRef.current || isErasePointer(event.nativeEvent)
        ? "erase"
        : "draw";
    const point = pointFromEvent(canvas, event.nativeEvent, kind);
    liveStrokeRef.current = { kind, points: [point] };
    const ctx = inkContext(canvas, kind);
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.nativeEvent.pointerId) return;
    const canvas = canvasRef.current;
    const stroke = liveStrokeRef.current;
    if (!canvas || !stroke) return;
    event.preventDefault();
    const coalesced =
      event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const raw of coalesced) {
      const point = pointFromEvent(canvas, raw, stroke.kind);
      const prev = stroke.points[stroke.points.length - 1];
      stroke.points.push(point);
      if (prev) paintSegment(prev, point, stroke.kind);
    }
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.nativeEvent.pointerId) return;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.nativeEvent.pointerId)) {
      canvas.releasePointerCapture(event.nativeEvent.pointerId);
    }
    pointerIdRef.current = null;
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current.push(stroke);
    }
  };

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none cursor-crosshair"
        aria-label="Drawing canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  );
}
