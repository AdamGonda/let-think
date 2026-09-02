import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CanvasColorPalette } from "./CanvasColorPalette";
import { DEFAULT_INK_COLOR } from "./canvasInkColors";
import { CanvasSizeSlider } from "./CanvasSizeSlider";
import { useMutation, useQuery } from "convex/react";
import { timings } from "@/config";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";
import {
  IMAGE_JPEG_QUALITY,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_EDGE,
} from "../../lib/imageAttach";
import {
  registerCanvasSnapshot,
  setCanvasHasInk,
} from "../../lib/canvasSnapshot";

type Point = { x: number; y: number };
type StrokePoint = { x: number; y: number; width: number; gap?: boolean };
type InkKind = "draw" | "erase";
type InkStroke = { kind: InkKind; points: StrokePoint[]; color?: string };
export type TextStroke = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
};
export type Stroke = InkStroke | TextStroke;
type TextDraft = {
  x: number;
  y: number;
  editIndex: number | null;
  initialText: string;
};

export type CanvasViewport = { x: number; y: number; scale: number };

const INK = DEFAULT_INK_COLOR;
/** Pointer Events: eraser contact is button 5 / buttons bit 5 (32). */
const ERASER_BUTTON = 5;
const ERASER_BUTTONS_MASK = 32;
const TEXT_LINE_HEIGHT = 1.2;
const TEXT_WIDTH_FALLBACK = 0.55;
const TEXT_MOVE_THRESHOLD = 5;
/** Pointer events don't carry click count; time a second down as double-click. */
const TEXT_DBLCLICK_MS = 400;
const TEXT_DBLCLICK_PX = 8;

export const CANVAS_MIN_SCALE = 0.25;
export const CANVAS_MAX_SCALE = 8;
export const DEFAULT_PEN_SIZE = 2;
export const DEFAULT_ERASE_SIZE = 40;
export const DEFAULT_TEXT_SIZE = 48;
export const PEN_SIZE_MIN = 1;
export const PEN_SIZE_MAX = 40;
export const ERASE_SIZE_MIN = 8;
export const ERASE_SIZE_MAX = 120;
export const TEXT_SIZE_MIN = 12;
export const TEXT_SIZE_MAX = 128;
const SNAPSHOT_PAD = 32;
const DEFAULT_SNAPSHOT_BG = "#18181b";

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

export const PEN_POS_SMOOTH = 0.35;
export const PEN_WIDTH_SMOOTH = 0.2;

export function strokeWidthForPointer(
  pointerType: string,
  pressure: number,
  kind: InkKind = "draw",
  userSize?: number,
): number {
  const size =
    userSize ?? (kind === "erase" ? DEFAULT_ERASE_SIZE : DEFAULT_PEN_SIZE);
  if (pointerType !== "pen") return size;
  // ponytail: stretch a typical Wacom contact band; slider is max width.
  const t = Math.min(1, Math.max(0, (pressure - 0.05) / 0.7));
  return Math.max(0.5, size * (0.12 + 0.88 * t));
}

export function isSmoothedPointer(pointerType: string): boolean {
  return pointerType === "pen" || pointerType === "eraser";
}

// ponytail: causal EMA is O(1) per sample. Ceiling is constant lag;
// upgrade to a 1€ filter in this helper if it feels drunk on fast strokes.
export function smoothInkPoint(
  prev: StrokePoint | null | undefined,
  next: StrokePoint,
  posAlpha = PEN_POS_SMOOTH,
  widthAlpha = PEN_WIDTH_SMOOTH,
): StrokePoint {
  if (!prev || next.gap) return next;
  return {
    x: prev.x + (next.x - prev.x) * posAlpha,
    y: prev.y + (next.y - prev.y) * posAlpha,
    width: prev.width + (next.width - prev.width) * widthAlpha,
  };
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

export function canvasTextFont(fontSize: number): string {
  return `${fontSize}px "DM Sans", ui-sans-serif, system-ui, sans-serif`;
}

export function canvasTextStroke(
  x: number,
  y: number,
  raw: string,
  fontSize: number = DEFAULT_TEXT_SIZE,
  color: string = INK,
): TextStroke | null {
  const text = raw.replace(/\u00a0/g, " ").trim();
  if (text === "") return null;
  return { kind: "text", x, y, text, fontSize, color };
}

export function estimatedTextWidth(text: string, fontSize: number): number {
  return fontSize * TEXT_WIDTH_FALLBACK * Math.max(text.length, 1);
}

export function textStrokeHits(
  stroke: TextStroke,
  point: Point,
  measureWidth?: (text: string, fontSize: number) => number,
): boolean {
  const measured = measureWidth?.(stroke.text, stroke.fontSize) ?? 0;
  const w =
    measured > 0 ? measured : estimatedTextWidth(stroke.text, stroke.fontSize);
  const h = stroke.fontSize * TEXT_LINE_HEIGHT;
  return (
    point.x >= stroke.x &&
    point.x <= stroke.x + w &&
    point.y >= stroke.y &&
    point.y <= stroke.y + h
  );
}

export function findTextStrokeAt(
  strokes: ReadonlyArray<Stroke>,
  point: Point,
  measureWidth?: (text: string, fontSize: number) => number,
): number | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    if (stroke?.kind === "text" && textStrokeHits(stroke, point, measureWidth)) {
      return i;
    }
  }
  return null;
}

export function scaleFontSize(
  startSize: number,
  startDist: number,
  nextDist: number,
  min = TEXT_SIZE_MIN,
  max = TEXT_SIZE_MAX,
): number {
  if (!(startDist > 0) || !Number.isFinite(startDist) || !Number.isFinite(nextDist)) {
    return startSize;
  }
  return Math.min(max, Math.max(min, startSize * (nextDist / startDist)));
}

export function moveWorldByScreenDelta(
  start: Point,
  dx: number,
  dy: number,
  scale: number,
): Point {
  const s = scale === 0 ? 1 : scale;
  return { x: start.x + dx / s, y: start.y + dy / s };
}

export function inkOverChrome(overChrome: boolean): {
  accept: boolean;
  broken: boolean;
} {
  if (overChrome) return { accept: false, broken: true };
  return { accept: true, broken: false };
}

type TextHandle = "tl" | "tr" | "bl" | "br";

const TEXT_HANDLES: ReadonlyArray<{
  corner: TextHandle;
  label: string;
  className: string;
}> = [
  { corner: "tl", label: "Resize text top-left", className: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { corner: "tr", label: "Resize text top-right", className: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { corner: "bl", label: "Resize text bottom-left", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { corner: "br", label: "Resize text bottom-right", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
];

function oppositeCorner(
  corner: TextHandle,
  frame: { left: number; top: number; right: number; bottom: number },
): Point {
  if (corner === "tl") return { x: frame.right, y: frame.bottom };
  if (corner === "tr") return { x: frame.left, y: frame.bottom };
  if (corner === "bl") return { x: frame.right, y: frame.top };
  return { x: frame.left, y: frame.top };
}

function capturePointer(target: EventTarget, pointerId: number): void {
  if (!(target instanceof HTMLElement) || !target.setPointerCapture) return;
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // No active pointer (jsdom / synthetic events).
  }
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
  if (stroke.kind === "text") {
    ctx.globalCompositeOperation = "source-over";
    setupInk(ctx, stroke.color);
    ctx.font = canvasTextFont(stroke.fontSize);
    ctx.textBaseline = "top";
    ctx.fillText(stroke.text, stroke.x, stroke.y);
    return;
  }
  applyKind(ctx, stroke.kind, stroke.color);
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
    if (!from || !to || to.gap) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = to.width;
    ctx.stroke();
  }
}

export function strokesHaveInk(strokes: Stroke[]): boolean {
  return strokes.some((stroke) => stroke.kind !== "erase");
}

export function strokeBounds(
  strokes: Stroke[],
): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number, pad = 0) => {
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad);
    maxY = Math.max(maxY, y + pad);
  };
  for (const stroke of strokes) {
    if (stroke.kind === "draw" || stroke.kind === "erase") {
      for (const point of stroke.points) {
        include(point.x, point.y, point.width / 2);
      }
      continue;
    }
    if (stroke.kind === "text") {
      include(stroke.x, stroke.y);
      include(
        stroke.x + estimatedTextWidth(stroke.text, stroke.fontSize),
        stroke.y + stroke.fontSize * TEXT_LINE_HEIGHT,
      );
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX - SNAPSHOT_PAD,
    y: minY - SNAPSHOT_PAD,
    w: Math.max(1, maxX - minX + SNAPSHOT_PAD * 2),
    h: Math.max(1, maxY - minY + SNAPSHOT_PAD * 2),
  };
}

export function strokesToJpegBlob(
  strokes: Stroke[],
  background = DEFAULT_SNAPSHOT_BG,
): Promise<Blob | null> {
  if (!strokesHaveInk(strokes)) return Promise.resolve(null);
  const bounds = strokeBounds(strokes);
  if (!bounds) return Promise.resolve(null);
  const scale = Math.min(
    1,
    IMAGE_MAX_EDGE / Math.max(bounds.w, bounds.h, 1),
  );
  const width = Math.max(1, Math.round(bounds.w * scale));
  const height = Math.max(1, Math.round(bounds.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = background || DEFAULT_SNAPSHOT_BG;
  ctx.fillRect(0, 0, width, height);
  ctx.scale(scale, scale);
  ctx.translate(-bounds.x, -bounds.y);
  setupInk(ctx);
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size > IMAGE_MAX_BYTES) {
          resolve(null);
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      IMAGE_JPEG_QUALITY,
    );
  });
}

function canvasScreenPoint(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function worldPoint(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
  vp: CanvasViewport,
): Point {
  return screenToWorld(vp, canvasScreenPoint(canvas, event));
}

function pointFromEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
  kind: InkKind,
  vp: CanvasViewport,
  userSize: number,
): StrokePoint {
  const { x, y } = worldPoint(canvas, event, vp);
  return {
    x,
    y,
    width: strokeWidthForPointer(event.pointerType, event.pressure, kind, userSize),
  };
}

function setupInk(ctx: CanvasRenderingContext2D, color = INK): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
}

function applyKind(
  ctx: CanvasRenderingContext2D,
  kind: InkKind,
  color = INK,
): void {
  ctx.globalCompositeOperation = kind === "erase" ? "destination-out" : "source-over";
  setupInk(ctx, kind === "erase" ? INK : color);
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
  color = INK,
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  applyCamera(ctx, vp);
  applyKind(ctx, kind, color);
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

function measureTextWidth(
  canvas: HTMLCanvasElement | null,
  text: string,
  fontSize: number,
): number {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return 0;
  ctx.font = canvasTextFont(fontSize);
  return ctx.measureText(text).width;
}

function isOverCanvasChrome(clientX: number, clientY: number): boolean {
  const hit = document.elementFromPoint(clientX, clientY);
  return hit instanceof Element && hit.closest("[data-canvas-chrome]") != null;
}

type TextMove = {
  pointerId: number;
  start: Point;
  originX: number;
  originY: number;
  index?: number;
};

function normalizeStoredStroke(stroke: Stroke): Stroke | null {
  if (stroke.kind === "text") {
    return {
      ...stroke,
      fontSize: stroke.fontSize ?? DEFAULT_TEXT_SIZE,
      color: stroke.color ?? INK,
    };
  }
  if (stroke.kind === "draw") {
    return { ...stroke, color: stroke.color ?? INK };
  }
  if (stroke.kind === "erase") return stroke;
  return null;
}

type SessionCanvasProps = {
  active: boolean;
  sessionId?: Id<"sessions"> | null;
};

export function SessionCanvas({ active, sessionId = null }: SessionCanvasProps) {
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
  const textDraftRef = useRef<TextDraft | null>(null);
  const textSizeRef = useRef(DEFAULT_TEXT_SIZE);
  const textFrameRef = useRef<HTMLDivElement>(null);
  const textResizeRef = useRef<{
    pointerId: number;
    startSize: number;
    origin: Point;
    startDist: number;
  } | null>(null);
  const textMoveRef = useRef<TextMove | null>(null);
  const textMovePendingRef = useRef<TextMove | null>(null);
  const lastTextClickRef = useRef<{
    at: number;
    x: number;
    y: number;
    index: number;
  } | null>(null);
  const inkBrokenRef = useRef(false);
  const redrawRef = useRef<() => void>(() => {});
  const inkColorRef = useRef(DEFAULT_INK_COLOR);
  const revisionRef = useRef(0);
  const hydratedRef = useRef(false);
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [textHoverMove, setTextHoverMove] = useState(false);
  const [eraseCursor, setEraseCursor] = useState<Point | null>(null);
  const [viewportOverride, setViewport] = useState<CanvasViewport | null>(null);
  const [revision, setRevision] = useState(0);
  const [penSize, setPenSize] = useState(DEFAULT_PEN_SIZE);
  const [eraseSize, setEraseSize] = useState(DEFAULT_ERASE_SIZE);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);
  const [inkColor, setInkColor] = useState<string>(DEFAULT_INK_COLOR);

  const storedCanvas = useQuery(
    api.sessions.getCanvas,
    sessionId ? { sessionId } : "skip",
  );
  const updateCanvas = useMutation(api.sessions.updateCanvas);
  const viewport =
    viewportOverride ?? storedCanvas?.viewport ?? identityViewport();

  useEffect(() => {
    textSizeRef.current = textSize;
    inkColorRef.current = inkColor;
  }, [textSize, inkColor]);

  const markDirty = useCallback(() => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
  }, []);

  const persistCanvas = useCallback(() => {
    if (!sessionId || revisionRef.current === 0) return;
    void updateCanvas({
      sessionId,
      strokes: strokesRef.current,
      viewport: viewportRef.current,
    });
  }, [sessionId, updateCanvas]);
  const persistCanvasRef = useRef(persistCanvas);

  useLayoutEffect(() => {
    if (!active) textDraftRef.current = null;
  }, [active]);

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
      const hideIndex = textDraftRef.current?.editIndex;
      for (let i = 0; i < strokesRef.current.length; i++) {
        if (i === hideIndex) continue;
        const stroke = strokesRef.current[i];
        if (stroke) drawStroke(ctx, stroke);
      }
      if (liveStrokeRef.current) {
        drawStroke(ctx, liveStrokeRef.current);
      }
    };

    redrawRef.current = redraw;
    const observer = new ResizeObserver(redraw);
    observer.observe(wrap);
    redraw();
    const snapshotBg = () => {
      const bg = getComputedStyle(wrap).backgroundColor;
      if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
        return DEFAULT_SNAPSHOT_BG;
      }
      return bg;
    };
    registerCanvasSnapshot(() =>
      strokesToJpegBlob(strokesRef.current, snapshotBg()),
    );
    setCanvasHasInk(strokesHaveInk(strokesRef.current));
    return () => {
      observer.disconnect();
      registerCanvasSnapshot(null);
      setCanvasHasInk(false);
    };
  }, []);

  useEffect(() => {
    persistCanvasRef.current = persistCanvas;
  }, [persistCanvas]);

  useLayoutEffect(() => {
    if (!sessionId || storedCanvas === undefined || hydratedRef.current) return;
    hydratedRef.current = true;
    if (revisionRef.current > 0) return;
    if (!storedCanvas) return;
    strokesRef.current = storedCanvas.strokes
      .map((stroke) => normalizeStoredStroke(stroke as Stroke))
      .filter((stroke): stroke is Stroke => stroke != null);
    viewportRef.current = storedCanvas.viewport;
    setCanvasHasInk(strokesHaveInk(strokesRef.current));
    redrawRef.current();
  }, [sessionId, storedCanvas]);

  useEffect(() => {
    return () => {
      persistCanvasRef.current();
    };
  }, []);

  useEffect(() => {
    if (!sessionId || revision === 0) return;
    const timer = window.setTimeout(
      persistCanvas,
      timings.draftSaveDebounceMs,
    );
    return () => window.clearTimeout(timer);
  }, [sessionId, revision, persistCanvas]);

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
      markDirty();
      redrawRef.current();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [active, markDirty]);

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
        markDirty();
      }
      setCanvasHasInk(strokesHaveInk(strokesRef.current));
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
  }, [active, markDirty]);

  const textDraftOpen = textDraft != null;
  const textDraftEditIndex = textDraft?.editIndex ?? null;
  const textDraftInitial = textDraft?.initialText ?? "";
  useEffect(() => {
    if (!textDraftOpen) return;
    const el = textElRef.current;
    if (!el) return;
    if (textDraftInitial) el.innerText = textDraftInitial;
    el.focus();
  }, [textDraftOpen, textDraftEditIndex, textDraftInitial]);

  if (!active && textDraft !== null) {
    setTextDraft(null);
  }

  const commitViewport = (next: CanvasViewport) => {
    viewportRef.current = next;
    setViewport(next);
    markDirty();
    redrawRef.current();
  };

  const abortLiveStroke = () => {
    drawingPointerIdRef.current = null;
    inkBrokenRef.current = false;
    if (!liveStrokeRef.current) return;
    liveStrokeRef.current = null;
    redrawRef.current();
  };

  const openTextDraft = (draft: TextDraft) => {
    textDraftRef.current = draft;
    setTextDraft(draft);
    redrawRef.current();
  };

  const commitTextDraft = () => {
    const draft = textDraftRef.current;
    if (!draft) return;
    const raw =
      textElRef.current?.innerText || textElRef.current?.textContent || "";
    const stroke = canvasTextStroke(
      draft.x,
      draft.y,
      raw,
      textSizeRef.current,
      inkColorRef.current,
    );
    const editIndex = draft.editIndex;
    textDraftRef.current = null;
    setTextDraft(null);
    if (editIndex != null) {
      if (!stroke) {
        strokesRef.current = strokesRef.current.filter((_, i) => i !== editIndex);
      } else {
        strokesRef.current = strokesRef.current.map((item, i) =>
          i === editIndex ? stroke : item,
        );
      }
    } else if (stroke) {
      strokesRef.current.push(stroke);
    }
    if (editIndex != null || stroke) markDirty();
    setCanvasHasInk(strokesHaveInk(strokesRef.current));
    redrawRef.current();
  };

  const cancelTextDraft = () => {
    if (!textDraftRef.current) return;
    textDraftRef.current = null;
    setTextDraft(null);
    redrawRef.current();
  };

  const onTextHandleDown = (
    corner: TextHandle,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const frame = textFrameRef.current?.getBoundingClientRect();
    if (!frame) return;
    const origin = oppositeCorner(corner, frame);
    const startDist = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    textResizeRef.current = {
      pointerId: event.pointerId,
      startSize: textSizeRef.current,
      origin,
      startDist,
    };
    capturePointer(event.currentTarget, event.pointerId);
  };

  const onTextHandleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = textResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.preventDefault();
    const nextDist = Math.hypot(
      event.clientX - resize.origin.x,
      event.clientY - resize.origin.y,
    );
    const next = scaleFontSize(resize.startSize, resize.startDist, nextDist);
    textSizeRef.current = next;
    setTextSize(next);
  };

  const onTextHandleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = textResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    textResizeRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onTextMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const draft = textDraftRef.current;
    if (!draft) return;
    textMoveRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      originX: draft.x,
      originY: draft.y,
    };
    capturePointer(event.currentTarget, event.pointerId);
  };

  const onTextMoveMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const move = textMoveRef.current;
    const draft = textDraftRef.current;
    if (!move || !draft || move.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = moveWorldByScreenDelta(
      { x: move.originX, y: move.originY },
      event.clientX - move.start.x,
      event.clientY - move.start.y,
      viewportRef.current.scale,
    );
    const updated = { ...draft, x: next.x, y: next.y };
    textDraftRef.current = updated;
    setTextDraft(updated);
  };

  const onTextMoveUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const move = textMoveRef.current;
    textMovePendingRef.current = null;
    if (!move || move.pointerId !== event.pointerId) return;
    textMoveRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onTextBoxPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const draft = textDraftRef.current;
    if (!draft) return;
    textMovePendingRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      originX: draft.x,
      originY: draft.y,
    };
  };

  const onTextBoxPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pending = textMovePendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    if (!textMoveRef.current) {
      const dist = Math.hypot(
        event.clientX - pending.start.x,
        event.clientY - pending.start.y,
      );
      if (dist < 5) return;
      textMoveRef.current = pending;
      capturePointer(event.currentTarget, event.pointerId);
    }
    onTextMoveMove(event);
  };

  const paintSegment = (
    from: StrokePoint,
    to: StrokePoint,
    kind: InkKind,
    color = INK,
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas
      ? inkContext(canvas, kind, viewportRef.current, color)
      : null;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = to.width;
    ctx.stroke();
  };

  const hitTextAt = (
    canvas: HTMLCanvasElement,
    event: { clientX: number; clientY: number },
  ): number | null => {
    const point = worldPoint(canvas, event, viewportRef.current);
    return findTextStrokeAt(strokesRef.current, point, (text, fontSize) =>
      measureTextWidth(canvas, text, fontSize),
    );
  };

  const clearTextMove = () => {
    textMoveRef.current = null;
    textMovePendingRef.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    const screen = canvasScreenPoint(canvas, event.nativeEvent);
    pointersRef.current.set(event.nativeEvent.pointerId, screen);
    capturePointer(canvas, event.nativeEvent.pointerId);

    const gesture = classifyPointerGesture(
      pointersRef.current.size,
      isPanModifier(event, commandHeldRef.current),
    );
    if (gesture === "pan" || gesturingRef.current) {
      gesturingRef.current = true;
      abortLiveStroke();
      clearTextMove();
      return;
    }
    if (pointersRef.current.size > 1) return;

    const erase =
      tool === "erase" || isErasePointer(event.nativeEvent);

    if (!erase && tool === "text") {
      if (textDraftRef.current) {
        commitTextDraft();
        setTextHoverMove(hitTextAt(canvas, event.nativeEvent) != null);
        return;
      }
      const point = worldPoint(canvas, event.nativeEvent, viewportRef.current);
      const hit = hitTextAt(canvas, event.nativeEvent);
      if (hit != null) {
        const existing = strokesRef.current[hit];
        if (existing?.kind !== "text") return;
        const now = event.timeStamp;
        const prev = lastTextClickRef.current;
        if (
          prev &&
          prev.index === hit &&
          now - prev.at <= TEXT_DBLCLICK_MS &&
          Math.hypot(event.clientX - prev.x, event.clientY - prev.y) <=
            TEXT_DBLCLICK_PX
        ) {
          lastTextClickRef.current = null;
          clearTextMove();
          setTextSize(existing.fontSize);
          textSizeRef.current = existing.fontSize;
          setInkColor(existing.color);
          inkColorRef.current = existing.color;
          openTextDraft({
            x: existing.x,
            y: existing.y,
            editIndex: hit,
            initialText: existing.text,
          });
          return;
        }
        lastTextClickRef.current = {
          at: now,
          x: event.clientX,
          y: event.clientY,
          index: hit,
        };
        textMovePendingRef.current = {
          pointerId: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          originX: existing.x,
          originY: existing.y,
          index: hit,
        };
        setTextHoverMove(true);
        return;
      }
      lastTextClickRef.current = null;
      openTextDraft({
        x: point.x,
        y: point.y,
        editIndex: null,
        initialText: "",
      });
      return;
    }

    drawingPointerIdRef.current = event.nativeEvent.pointerId;
    inkBrokenRef.current = false;
    const userSize = erase ? eraseSize : penSize;

    if (erase) {
      trackEraseCursor(event.nativeEvent);
      const point = pointFromEvent(
        canvas,
        event.nativeEvent,
        "erase",
        viewportRef.current,
        userSize,
      );
      liveStrokeRef.current = { kind: "erase", points: [point] };
      const ctx = inkContext(canvas, "erase", viewportRef.current);
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const point = pointFromEvent(
      canvas,
      event.nativeEvent,
      "draw",
      viewportRef.current,
      userSize,
    );
    liveStrokeRef.current = { kind: "draw", points: [point], color: inkColorRef.current };
    const ctx = inkContext(
      canvas,
      "draw",
      viewportRef.current,
      inkColorRef.current,
    );
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

  const trackTextHover = (event: PointerEvent) => {
    if (tool !== "text" || textDraftRef.current) {
      setTextHoverMove(false);
      return;
    }
    if (textMoveRef.current || textMovePendingRef.current) {
      setTextHoverMove(true);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTextHoverMove(hitTextAt(canvas, event) != null);
  };

  const applyCommittedTextMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): boolean => {
    const pending = textMovePendingRef.current;
    if (
      pending &&
      pending.pointerId === event.pointerId &&
      !textMoveRef.current
    ) {
      const dist = Math.hypot(
        event.clientX - pending.start.x,
        event.clientY - pending.start.y,
      );
      if (dist < TEXT_MOVE_THRESHOLD) return true;
      textMoveRef.current = pending;
    }
    const move = textMoveRef.current;
    if (!move || move.pointerId !== event.pointerId) return false;
    if (move.index == null) return false;
    event.preventDefault();
    const next = moveWorldByScreenDelta(
      { x: move.originX, y: move.originY },
      event.clientX - move.start.x,
      event.clientY - move.start.y,
      viewportRef.current.scale,
    );
    const stroke = strokesRef.current[move.index];
    if (stroke?.kind === "text") {
      strokesRef.current[move.index] = { ...stroke, x: next.x, y: next.y };
      markDirty();
      redrawRef.current();
    }
    return true;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    trackEraseCursor(event.nativeEvent);
    trackTextHover(event.nativeEvent);
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
      clearTextMove();
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

    if (applyCommittedTextMove(event)) return;

    if (drawingPointerIdRef.current !== id) return;
    const stroke = liveStrokeRef.current;
    if (!stroke) return;
    event.preventDefault();
    if (stroke.kind !== "draw" && stroke.kind !== "erase") return;
    const userSize = stroke.kind === "erase" ? eraseSize : penSize;
    const coalesced =
      event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const raw of coalesced) {
      const wasBroken = inkBrokenRef.current;
      const action = inkOverChrome(
        isOverCanvasChrome(raw.clientX, raw.clientY),
      );
      inkBrokenRef.current = action.broken;
      if (!action.accept) continue;
      const prevPoint = stroke.points[stroke.points.length - 1];
      const rawPoint: StrokePoint = {
        ...pointFromEvent(
          canvas,
          raw,
          stroke.kind,
          viewportRef.current,
          userSize,
        ),
        ...(wasBroken ? { gap: true } : {}),
      };
      const point = isSmoothedPointer(raw.pointerType)
        ? smoothInkPoint(prevPoint, rawPoint)
        : rawPoint;
      stroke.points.push(point);
      if (prevPoint && !point.gap) {
        paintSegment(prevPoint, point, stroke.kind, stroke.color);
      }
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
    if (
      textMoveRef.current?.pointerId === id ||
      textMovePendingRef.current?.pointerId === id
    ) {
      if (textMoveRef.current?.pointerId === id) {
        lastTextClickRef.current = null;
        markDirty();
      }
      clearTextMove();
    }
    if (drawingPointerIdRef.current !== id) return;
    drawingPointerIdRef.current = null;
    const wasBroken = inkBrokenRef.current;
    inkBrokenRef.current = false;
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (!stroke) return;
    if (stroke.kind === "draw" || stroke.kind === "erase") {
      if (
        canvas &&
        !wasBroken &&
        isSmoothedPointer(event.nativeEvent.pointerType)
      ) {
        const userSize = stroke.kind === "erase" ? eraseSize : penSize;
        const rawPoint = pointFromEvent(
          canvas,
          event.nativeEvent,
          stroke.kind,
          viewportRef.current,
          userSize,
        );
        const last = stroke.points[stroke.points.length - 1];
        if (
          last &&
          (rawPoint.x !== last.x ||
            rawPoint.y !== last.y ||
            rawPoint.width !== last.width)
        ) {
          stroke.points.push(rawPoint);
          paintSegment(last, rawPoint, stroke.kind, stroke.color);
        }
      }
      if (stroke.points.length > 0) {
        strokesRef.current.push(stroke);
        markDirty();
        setCanvasHasInk(strokesHaveInk(strokesRef.current));
      }
      redrawRef.current();
      return;
    }
    redrawRef.current();
  };

  const cursorClass =
    tool === "text"
      ? textHoverMove
        ? "cursor-move"
        : "cursor-text"
      : tool === "erase"
        ? "cursor-none"
        : "cursor-crosshair";
  const eraseRingSize =
    strokeWidthForPointer("mouse", 0.5, "erase", eraseSize) * viewport.scale;
  const eraseScreen = eraseCursor ? worldToScreen(viewport, eraseCursor) : null;
  const textScreen = textDraft ? worldToScreen(viewport, textDraft) : null;
  const inkSlider =
    tool === "erase"
      ? {
          value: eraseSize,
          min: ERASE_SIZE_MIN,
          max: ERASE_SIZE_MAX,
          label: "Eraser size",
          onChange: setEraseSize,
        }
      : {
          value: penSize,
          min: PEN_SIZE_MIN,
          max: PEN_SIZE_MAX,
          label: "Pen size",
          onChange: setPenSize,
        };

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
            width: eraseRingSize,
            height: eraseRingSize,
            left: eraseScreen.x,
            top: eraseScreen.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
      <div
        data-canvas-chrome
        className="absolute top-1/2 left-3 z-10 flex -translate-y-1/2 flex-col items-center gap-2"
      >
        <CanvasColorPalette
          color={inkColor}
          onColorChange={(next) => {
            inkColorRef.current = next;
            setInkColor(next);
          }}
        />
        {tool !== "text" ? (
          <CanvasSizeSlider
            value={inkSlider.value}
            min={inkSlider.min}
            max={inkSlider.max}
            label={inkSlider.label}
            onChange={inkSlider.onChange}
          />
        ) : null}
      </div>
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
          ref={textFrameRef}
          data-testid="canvas-text-frame"
          className="absolute z-10"
          style={{ left: textScreen.x, top: textScreen.y }}
        >
          <div className="relative">
            <div
              role="button"
              aria-label="Move text"
              className="absolute -inset-2 z-0 cursor-move"
              onPointerDown={onTextMoveDown}
              onPointerMove={onTextMoveMove}
              onPointerUp={onTextMoveUp}
              onPointerCancel={onTextMoveUp}
            />
            <div
              ref={textElRef}
              role="textbox"
              aria-label="Canvas text"
              contentEditable
              suppressContentEditableWarning
              className="relative z-[1] min-w-[1ch] bg-transparent outline-none"
              style={{
                fontSize: `${textSize * viewport.scale}px`,
                fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
                color: inkColor,
                caretColor: inkColor,
                whiteSpace: "pre",
                lineHeight: TEXT_LINE_HEIGHT,
                minHeight: `${TEXT_LINE_HEIGHT}em`,
              }}
              onPointerDown={onTextBoxPointerDown}
              onPointerMove={onTextBoxPointerMove}
              onPointerUp={onTextMoveUp}
              onPointerCancel={onTextMoveUp}
              onBlur={(event) => {
                if (textResizeRef.current || textMoveRef.current) return;
                const next = event.relatedTarget;
                if (next instanceof Node && wrapRef.current?.contains(next)) return;
                commitTextDraft();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTextDraft();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelTextDraft();
                }
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 border border-[#3b82f6]"
            />
            {TEXT_HANDLES.map(({ corner, label, className }) => (
              <div
                key={corner}
                aria-label={label}
                className={`absolute z-10 size-2 border border-[#3b82f6] bg-background ${className}`}
                onPointerDown={(event) => onTextHandleDown(corner, event)}
                onPointerMove={onTextHandleMove}
                onPointerUp={onTextHandleUp}
                onPointerCancel={onTextHandleUp}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
