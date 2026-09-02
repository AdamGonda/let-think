type CanvasSnapshotFn = () => Promise<Blob | null>;

let canvasSnapshotFn: CanvasSnapshotFn | null = null;
let canvasHasInkFlag = false;
const canvasInkListeners = new Set<() => void>();

export function registerCanvasSnapshot(fn: CanvasSnapshotFn | null): void {
  canvasSnapshotFn = fn;
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

export function snapshotCanvasJpeg(): Promise<Blob | null> {
  return canvasSnapshotFn ? canvasSnapshotFn() : Promise.resolve(null);
}
