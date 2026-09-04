import type { CanvasFrameRef } from "./canvasFrames";

type CanvasSnapshotFn = () => Promise<Blob | null>;
type FrameSnapshotFn = (slug: string) => Promise<Blob | null>;

let canvasSnapshotFn: CanvasSnapshotFn | null = null;
let frameSnapshotFn: FrameSnapshotFn | null = null;
let canvasHasInkFlag = false;
let canvasFramesList: CanvasFrameRef[] = [];
const canvasInkListeners = new Set<() => void>();
const canvasFramesListeners = new Set<() => void>();

export function registerCanvasSnapshot(fn: CanvasSnapshotFn | null): void {
  canvasSnapshotFn = fn;
}

export function registerFrameSnapshot(fn: FrameSnapshotFn | null): void {
  frameSnapshotFn = fn;
}

export function getCanvasHasInk(): boolean {
  return canvasHasInkFlag;
}

export function setCanvasHasInk(next: boolean): void {
  if (canvasHasInkFlag === next) return;
  canvasHasInkFlag = next;
  for (const listener of canvasInkListeners) listener();
}

export function subscribeCanvasHasInk(listener: () => void): () => void {
  canvasInkListeners.add(listener);
  return () => {
    canvasInkListeners.delete(listener);
  };
}

export function getCanvasFrames(): CanvasFrameRef[] {
  return canvasFramesList;
}

export function setCanvasFrames(next: CanvasFrameRef[]): void {
  const same =
    next.length === canvasFramesList.length &&
    next.every(
      (f, i) =>
        f.id === canvasFramesList[i]?.id &&
        f.slug === canvasFramesList[i]?.slug &&
        f.name === canvasFramesList[i]?.name,
    );
  if (same) return;
  canvasFramesList = next;
  for (const listener of canvasFramesListeners) listener();
}

export function subscribeCanvasFrames(listener: () => void): () => void {
  canvasFramesListeners.add(listener);
  return () => {
    canvasFramesListeners.delete(listener);
  };
}

export function snapshotCanvasJpeg(): Promise<Blob | null> {
  return canvasSnapshotFn ? canvasSnapshotFn() : Promise.resolve(null);
}

export function snapshotFrameJpeg(slug: string): Promise<Blob | null> {
  return frameSnapshotFn ? frameSnapshotFn(slug) : Promise.resolve(null);
}
