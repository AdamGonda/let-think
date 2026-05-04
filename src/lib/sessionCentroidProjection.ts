import { UMAP } from "umap-js";

export type SessionCentroidVectorPoint = {
  sessionId: string;
  sessionTitle: string;
  projectName: string | null;
  vector: number[];
  sourceNodeCount: number;
};

export type SessionCentroidProjectedPoint = SessionCentroidVectorPoint & {
  x: number;
  y: number;
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeRange(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0);
  return values.map((value) => ((value - min) / (max - min)) * 2 - 1);
}

export function projectSessionCentroidsTo2D(
  input: SessionCentroidVectorPoint[]
): SessionCentroidProjectedPoint[] {
  if (input.length === 0) return [];
  if (input.length === 1) {
    return [{ ...input[0], x: 0, y: 0 }];
  }
  if (input.length === 2) {
    return [
      { ...input[0], x: -0.8, y: 0 },
      { ...input[1], x: 0.8, y: 0 },
    ];
  }

  const vectors = input.map((point) => point.vector);
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: Math.min(15, Math.max(2, input.length - 1)),
    minDist: 0.2,
    nEpochs: 250,
    random: mulberry32(42),
  });
  const embedding = umap.fit(vectors);
  const xs = normalizeRange(embedding.map((entry) => entry[0] ?? 0));
  const ys = normalizeRange(embedding.map((entry) => entry[1] ?? 0));
  return input.map((point, index) => ({
    ...point,
    x: xs[index] ?? 0,
    y: ys[index] ?? 0,
  }));
}
