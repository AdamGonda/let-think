import { cn } from "@/lib/utils";
import {
  CANVAS_INK_COLORS,
  DEFAULT_INK_COLOR,
  type CanvasInkColor,
} from "./canvasInkColors";

type CanvasColorPaletteProps = {
  color: string;
  onColorChange: (color: CanvasInkColor) => void;
};

export function CanvasColorPalette({
  color,
  onColorChange,
}: CanvasColorPaletteProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ink color"
      data-canvas-chrome
      className={cn(
        "flex flex-col items-center py-1",
        "rounded-[min(var(--radius-md),12px)] border border-border bg-background",
        "dark:border-input",
      )}
    >
      {CANVAS_INK_COLORS.map((option) => {
        const selected = option.value === color;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            className="flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={() => {
              if (option.value !== color) onColorChange(option.value);
            }}
          >
            <span
              aria-hidden
              className={cn(
                "size-4 rounded-full",
                selected &&
                  "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                option.value === DEFAULT_INK_COLOR &&
                  "shadow-[inset_0_0_0_1px] shadow-foreground/40",
              )}
              style={{ backgroundColor: option.value }}
            />
          </button>
        );
      })}
    </div>
  );
}
