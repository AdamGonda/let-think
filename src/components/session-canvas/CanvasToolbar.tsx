import {
  Circle,
  Eraser,
  Minus,
  Pencil,
  Square,
  Type,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasTool = "pen" | "erase" | "text" | "rect" | "ellipse" | "line";

const CANVAS_TOOL_OPTIONS: ReadonlyArray<{
  tool: CanvasTool;
  label: string;
  Icon: LucideIcon;
}> = [
  { tool: "pen", label: "Pen", Icon: Pencil },
  { tool: "erase", label: "Eraser", Icon: Eraser },
  { tool: "text", label: "Text", Icon: Type },
  { tool: "rect", label: "Rectangle", Icon: Square },
  { tool: "ellipse", label: "Ellipse", Icon: Circle },
  { tool: "line", label: "Line", Icon: Minus },
];

const HIGHLIGHT_TRANSLATE = [
  "translate-x-0",
  "translate-x-full",
  "translate-x-[200%]",
  "translate-x-[300%]",
  "translate-x-[400%]",
  "translate-x-[500%]",
] as const;

type CanvasToolbarProps = {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
};

export function CanvasToolbar({ tool, onToolChange }: CanvasToolbarProps) {
  const selectedIndex = CANVAS_TOOL_OPTIONS.findIndex(
    (option) => option.tool === tool,
  );
  const highlightTranslate = HIGHLIGHT_TRANSLATE[selectedIndex] ?? "translate-x-0";

  return (
    <div
      role="radiogroup"
      aria-label="Canvas tools"
      className="absolute top-3 left-1/2 z-10 flex h-7 w-[10.5rem] -translate-x-1/2 overflow-hidden rounded-[min(var(--radius-md),12px)] border border-border bg-background dark:border-input dark:bg-input/30"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 w-1/6 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
          highlightTranslate,
        )}
      />
      {CANVAS_TOOL_OPTIONS.map(({ tool: option, label, Icon }) => {
        const selected = option === tool;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            className={cn(
              "relative z-10 flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-75 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected ? "text-foreground" : "text-muted-foreground/55",
            )}
            onClick={() => {
              if (option !== tool) onToolChange(option);
            }}
          >
            <Icon className={cn("size-4", selected && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
