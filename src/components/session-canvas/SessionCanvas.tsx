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
type ShapeKind = "rect" | "ellipse" | "line";
type InkStroke = { kind: InkKind; points: StrokePoint[] };
type ShapeStroke = { kind: ShapeKind; from: Point; to: Point; width: number };
type TextStroke = { kind: "text"; x: number; y: number; text: string };
type Stroke = InkStroke | ShapeStroke | TextStroke;

const INK = "#ffffff";
const MOUSE_WIDTH = 2;
const PEN_MIN_WIDTH = 1.25;
const PEN_PRESSURE_RANGE = 5;
const ERASE_WIDTH_MULTIPLIER = 6;
const ERASE_MIN_WIDTH = 40;
/** Pointer Events: eraser contact is button 5 / buttons bit 5 (32). */
const ERASER_BUTTON = 5;
const ERASER_BUTTONS_MASK = 32;
export const CANVAS_TEXT_FONT =
  '48px "DM Sans", ui-sans-serif, system-ui, sans-serif';

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
  return tool === "rect" || tool === "ellipse" || tool === "line";
}

function drawShape(ctx: CanvasRenderingContext2D, stroke: ShapeStroke): void {
  ctx.lineWidth = stroke.width;
  if (stroke.kind === "line") {
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.stroke();
    return;
  }
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
  if (
    stroke.kind === "rect" ||
    stroke.kind === "ellipse" ||
    stroke.kind === "line"
  ) {
    ctx.globalCompositeOperation = "source-over";
    setupInk(ctx);
    drawShape(ctx, stroke);
  }
}

function clientPoint(canvas: HTMLCanvasElement, event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function pointFromEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  kind: InkKind,
): StrokePoint {
  const { x, y } = clientPoint(canvas, event);
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

function inkContext(
  canvas: HTMLCanvasElement,
  kind: InkKind,
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
};

export function SessionCanvas({ active }: SessionCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textElRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const textDraftRef = useRef<Point | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [textDraft, setTextDraft] = useState<Point | null>(null);
  const [eraseCursor, setEraseCursor] = useState<Point | null>(null);

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
    const erase =
      tool === "erase" || isErasePointer(event.nativeEvent);

    if (!erase && tool === "text") {
      if (textDraftRef.current) {
        commitTextDraft();
        return;
      }
      const point = clientPoint(canvas, event.nativeEvent);
      textDraftRef.current = point;
      setTextDraft(point);
      return;
    }

    canvas.setPointerCapture(event.nativeEvent.pointerId);
    pointerIdRef.current = event.nativeEvent.pointerId;

    if (erase) {
      trackEraseCursor(event.nativeEvent);
      const point = pointFromEvent(canvas, event.nativeEvent, "erase");
      liveStrokeRef.current = { kind: "erase", points: [point] };
      const ctx = inkContext(canvas, "erase");
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (isShapeTool(tool)) {
      const from = clientPoint(canvas, event.nativeEvent);
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

    const point = pointFromEvent(canvas, event.nativeEvent, "draw");
    liveStrokeRef.current = { kind: "draw", points: [point] };
    const ctx = inkContext(canvas, "draw");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const trackEraseCursor = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || tool !== "erase") return;
    setEraseCursor(clientPoint(canvas, event));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    trackEraseCursor(event.nativeEvent);
    if (pointerIdRef.current !== event.nativeEvent.pointerId) return;
    const canvas = canvasRef.current;
    const stroke = liveStrokeRef.current;
    if (!canvas || !stroke) return;
    event.preventDefault();
    if (
      stroke.kind === "rect" ||
      stroke.kind === "ellipse" ||
      stroke.kind === "line"
    ) {
      stroke.to = clientPoint(canvas, event.nativeEvent);
      redrawRef.current();
      return;
    }
    if (stroke.kind !== "draw" && stroke.kind !== "erase") return;
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
    if (!stroke) return;
    if (stroke.kind === "draw" || stroke.kind === "erase") {
      if (stroke.points.length > 0) strokesRef.current.push(stroke);
      return;
    }
    if (
      (stroke.kind === "rect" ||
        stroke.kind === "ellipse" ||
        stroke.kind === "line") &&
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
  const eraseSize = strokeWidthForPointer("mouse", 0.5, "erase");

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full touch-none ${cursorClass}`}
        aria-label="Drawing canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerEnter={(event) => trackEraseCursor(event.nativeEvent)}
        onPointerLeave={() => {
          if (pointerIdRef.current == null) setEraseCursor(null);
        }}
        onContextMenu={(event) => event.preventDefault()}
      />
      {tool === "erase" && eraseCursor ? (
        <div
          data-testid="erase-radius"
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-full border border-white/70"
          style={{
            width: eraseSize,
            height: eraseSize,
            left: eraseCursor.x,
            top: eraseCursor.y,
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
      {textDraft ? (
        <div
          ref={textElRef}
          role="textbox"
          aria-label="Canvas text"
          contentEditable
          suppressContentEditableWarning
          className="absolute z-10 min-w-[1ch] bg-transparent text-white outline-none"
          style={{
            left: textDraft.x,
            top: textDraft.y,
            font: CANVAS_TEXT_FONT,
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
