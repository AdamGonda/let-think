export const DEFAULT_INK_COLOR = "#ffffff";

export const CANVAS_INK_COLORS = [
  { label: "White", value: DEFAULT_INK_COLOR },
  { label: "Purple", value: "#a855f7" },
  { label: "Yellow", value: "#eab308" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
] as const;

export type CanvasInkColor = (typeof CANVAS_INK_COLORS)[number]["value"];
