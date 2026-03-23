import { cn } from "@/lib/utils";

type UserCardModeToggleProps = {
  isWorkMode: boolean;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
};

export function UserCardModeToggle({
  isWorkMode,
  onToggle,
  compact,
  className,
}: UserCardModeToggleProps) {
  const label = isWorkMode ? "Think" : "Deep";
  const switchTo = isWorkMode ? "Deep" : "Think";
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (compact) {
    return (
      <button
        type="button"
        className={cn(
          "z-10 flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-background transition-opacity hover:opacity-90",
          focusRing,
          className,
        )}
        style={{ backgroundColor: "var(--session-accent)" }}
        onClick={onToggle}
        aria-label={`${label} mode. Click to switch to ${switchTo}.`}
      >
        {isWorkMode ? "T" : "D"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90",
        focusRing,
        className,
      )}
      style={{ backgroundColor: "var(--session-accent)" }}
      onClick={onToggle}
      aria-label={`${label} mode. Click to switch to ${switchTo}.`}
    >
      {label}
    </button>
  );
}
