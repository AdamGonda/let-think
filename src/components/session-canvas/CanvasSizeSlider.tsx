import { cn } from "@/lib/utils";

type CanvasSizeSliderProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
};

const TAPER_WIDTH = 16;
const TAPER_HEIGHT = 112;
const TAPER_TOP = 6;
const TAPER_BOTTOM = 2;

export function sizeTaperPolygon(
  height: number,
  width: number,
  topWidth: number,
  bottomWidth: number,
): string {
  const cx = width / 2;
  return [
    `${cx - bottomWidth / 2},${height}`,
    `${cx - topWidth / 2},0`,
    `${cx + topWidth / 2},0`,
    `${cx + bottomWidth / 2},${height}`,
  ].join(" ");
}

/** Vertical-lr + rtl: max is at the top. */
export function sizeSliderThumbTop(
  value: number,
  min: number,
  max: number,
): string {
  const span = max - min;
  const t = span === 0 ? 0 : (max - value) / span;
  return `${t * 100}%`;
}

export function CanvasSizeSlider({
  value,
  min,
  max,
  label,
  onChange,
}: CanvasSizeSliderProps) {
  return (
    <div
      data-canvas-chrome
      className={cn(
        "absolute top-1/2 left-3 z-10 flex h-36 w-7 -translate-y-1/2 items-center justify-center",
        "rounded-[min(var(--radius-md),12px)] border border-border bg-background",
        "dark:border-input",
      )}
    >
      <div className="relative h-28 w-4">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full text-foreground/70"
          viewBox={`0 0 ${TAPER_WIDTH} ${TAPER_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <polygon
            fill="currentColor"
            points={sizeTaperPolygon(
              TAPER_HEIGHT,
              TAPER_WIDTH,
              TAPER_TOP,
              TAPER_BOTTOM,
            )}
          />
        </svg>
        <div
          aria-hidden
          data-testid="size-slider-thumb"
          className="pointer-events-none absolute left-1/2 z-[1] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ top: sizeSliderThumbTop(value, min, max) }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className={cn(
            "relative z-10 h-28 w-4 cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent",
            "[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-transparent",
          )}
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
