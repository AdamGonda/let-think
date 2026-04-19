import { cn } from "@/lib/utils";

const DEFAULT_TRACK = "bg-[#6e6e6e]";

export interface SwitchInternalLabel {
  /** Shown inside the track on the right when unchecked (knob left). */
  off: string;
  /** Shown inside the track on the left when checked (knob right). */
  on: string;
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-labelledby"?: string;
  className?: string;
  offTrackClassName?: string;
  onTrackClassName?: string;
  /**
   * Label drawn inside the pill on the side opposite the knob (OFF/ON style).
   */
  internalLabel?: SwitchInternalLabel;
}

/**
 * Flat pill toggle: medium-gray track, light circular knob (no shadows).
 * With `internalLabel`, the track is wider and shows the active mode text inside the body.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  "aria-labelledby": ariaLabelledBy,
  offTrackClassName,
  onTrackClassName,
  internalLabel,
}: SwitchProps) {
  const trackClass = checked
    ? (onTrackClassName ?? DEFAULT_TRACK)
    : (offTrackClassName ?? DEFAULT_TRACK);

  if (internalLabel) {
    const label = checked ? internalLabel.on : internalLabel.off;
    return (
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onCheckedChange(!checked);
        }}
        className={cn(
          "relative h-[26px] w-full min-w-[74px] rounded-full px-0.5 transition-colors",
          trackClass,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-10 size-[18px] -translate-y-1/2 rounded-full bg-[#f5f5f5] transition-[left] duration-200 ease-out"
          style={{ left: checked ? "calc(100% - 21px)" : "3px" }}
        />
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-white",
            checked ? "left-2.5 text-left" : "right-2.5 text-right",
          )}
        >
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "relative h-[22px] w-[44px] shrink-0 rounded-full transition-colors",
        trackClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-[3px] top-1/2 block size-[18px] -translate-y-1/2 rounded-full bg-[#f5f5f5] transition-transform duration-200 ease-out",
          checked && "translate-x-[22px]",
        )}
      />
    </button>
  );
}
