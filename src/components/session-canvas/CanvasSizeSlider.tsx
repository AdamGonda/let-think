import { cn } from "@/lib/utils";

type CanvasSizeSliderProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
};

export function CanvasSizeSlider({
  value,
  min,
  max,
  label,
  onChange,
}: CanvasSizeSliderProps) {
  return (
    <div
      className={cn(
        "absolute top-1/2 left-3 z-10 flex h-36 w-7 -translate-y-1/2 items-center justify-center",
        "rounded-[min(var(--radius-md),12px)] border border-border bg-background",
        "dark:border-input dark:bg-input/30",
      )}
    >
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
        className="h-28 w-4 cursor-pointer appearance-none bg-transparent accent-foreground"
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
