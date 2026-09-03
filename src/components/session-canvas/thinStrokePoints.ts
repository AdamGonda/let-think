/** Point with optional stroke gap (pen lifted over chrome mid-stroke). */
export type ThinablePoint = {
  x: number;
  y: number;
  width: number;
  gap?: boolean;
};

const DEFAULT_MIN_DIST = 0.75;
const DEFAULT_RDP_EPSILON = 0.6;

function distSq(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function perpDistSq(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distSq(p, a);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq),
  );
  return distSq(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Drop near-duplicate samples; always keep endpoints and gap markers. */
export function minDistanceThin(
  points: ThinablePoint[],
  minDist = DEFAULT_MIN_DIST,
): ThinablePoint[] {
  if (points.length <= 2) return points;
  const minDistSq = minDist * minDist;
  const out: ThinablePoint[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    if (p.gap) {
      out.push(p);
      continue;
    }
    const prev = out[out.length - 1]!;
    if (distSq(prev, p) >= minDistSq) out.push(p);
  }
  out.push(points[points.length - 1]!);
  return out;
}

/**
 * Ramer–Douglas–Peucker on continuous segments (split on `gap`).
 * Preserves width on kept points; never drops gap markers or segment ends.
 */
export function rdpThin(
  points: ThinablePoint[],
  epsilon = DEFAULT_RDP_EPSILON,
): ThinablePoint[] {
  if (points.length <= 2) return points;
  const epsSq = epsilon * epsilon;

  const simplify = (segment: ThinablePoint[]): ThinablePoint[] => {
    if (segment.length <= 2) return segment;
    let maxDist = 0;
    let maxIdx = 0;
    const first = segment[0]!;
    const last = segment[segment.length - 1]!;
    for (let i = 1; i < segment.length - 1; i++) {
      const d = perpDistSq(segment[i]!, first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist <= epsSq) return [first, last];
    const left = simplify(segment.slice(0, maxIdx + 1));
    const right = simplify(segment.slice(maxIdx));
    return left.slice(0, -1).concat(right);
  };

  // Split on gap markers so RDP never bridges a pen-up.
  const out: ThinablePoint[] = [];
  let segment: ThinablePoint[] = [];
  const flush = () => {
    if (segment.length === 0) return;
    out.push(...simplify(segment));
    segment = [];
  };
  for (const p of points) {
    if (p.gap) {
      flush();
      segment.push(p); // gap starts the next continuous segment
      continue;
    }
    segment.push(p);
  }
  flush();
  return out;
}

/** Min-distance then RDP. Apply on ink commit, not during live paint. */
export function thinStrokePoints(
  points: ThinablePoint[],
  opts?: { minDist?: number; epsilon?: number },
): ThinablePoint[] {
  if (points.length <= 2) return points;
  return rdpThin(
    minDistanceThin(points, opts?.minDist),
    opts?.epsilon,
  );
}
