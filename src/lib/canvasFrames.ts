import {
  CANVAS_REF_TOKEN,
  GRAPH_REF_TOKEN,
  WRITING_REF_TOKEN,
} from "./conceptReferences";

export type CanvasFrame = {
  id: string;
  name: string;
  slug: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasFrameRef = Pick<CanvasFrame, "id" | "name" | "slug">;

const RESERVED_SLUGS = new Set([
  WRITING_REF_TOKEN,
  GRAPH_REF_TOKEN,
  CANVAS_REF_TOKEN,
]);

/** Lowercase slug: letters, digits, hyphens; must start with a letter. */
export function slugifyFrameName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isReservedFrameSlug(slug: string): boolean {
  if (!slug) return true;
  if (RESERVED_SLUGS.has(slug)) return true;
  if (/^\d+$/.test(slug)) return true;
  return false;
}

export function isValidFrameSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{0,31}$/.test(slug) && !isReservedFrameSlug(slug);
}

/** Returns an error message, or null if the name/slug is usable. */
export function validateFrameName(
  rawName: string,
  existingSlugs: ReadonlyArray<string>,
  excludeSlug?: string,
): string | null {
  const name = rawName.trim();
  if (!name) return "Name is required";
  const slug = slugifyFrameName(name);
  if (!slug || !/^[a-z]/.test(slug)) {
    return "Name must start with a letter";
  }
  if (!isValidFrameSlug(slug)) {
    return "Name is reserved or invalid";
  }
  const taken = existingSlugs.some(
    (s) => s === slug && s !== excludeSlug,
  );
  if (taken) return "That name is already used";
  return null;
}

export function normalizeFrameRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minSize = 8,
): { x: number; y: number; w: number; h: number } | null {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  if (w < minSize || h < minSize) return null;
  return { x, y, w, h };
}

export function newFrameId(): string {
  return `frame_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
