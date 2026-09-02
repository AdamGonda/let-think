import { Eraser, Pencil, Type, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type CanvasTool = "pen" | "erase" | "text";

const CANVAS_TOOL_OPTIONS: ReadonlyArray<{
  tool: CanvasTool;
  label: string;
  Icon: LucideIcon;
}> = [
  { tool: "pen", label: "Pen", Icon: Pencil },
  { tool: "erase", label: "Eraser", Icon: Eraser },
  { tool: "text", label: "Text", Icon: Type },
];

const HIGHLIGHT_TRANSLATE = [
  "translate-x-0",
  "translate-x-full",
  "translate-x-[200%]",
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
  const [hovered, setHovered] = useState<CanvasTool | null>(null);

  return (
    <div
      role="radiogroup"
      aria-label="Canvas tools"
      className="absolute top-3 left-1/2 z-10 flex h-7 w-[5.25rem] -translate-x-1/2 overflow-visible rounded-[min(var(--radius-md),12px)] border border-border bg-background dark:border-input dark:bg-input/30"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={cn(
            "absolute inset-0 w-1/3 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
            highlightTranslate,
          )}
        />
      </span>
      {CANVAS_TOOL_OPTIONS.map(({ tool: option, label, Icon }) => {
        const selected = option === tool;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            className={cn(
              "relative z-10 flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-75 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected ? "text-foreground" : "text-muted-foreground/55",
            )}
            onMouseEnter={() => setHovered(option)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(option)}
            onBlur={() => setHovered(null)}
            onClick={() => {
              if (option !== tool) onToolChange(option);
            }}
          >
            <Icon className={cn("size-4", selected && "fill-current")} />
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium leading-none whitespace-nowrap text-background shadow-md",
                hovered === option ? "opacity-100" : "opacity-0",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
