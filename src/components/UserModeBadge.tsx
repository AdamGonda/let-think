type UserModeBadgeProps = {
  isWorkMode: boolean;
};

/** Small F/R pill on the profile avatar for compact sidebar. */
export function UserModeBadge({ isWorkMode }: UserModeBadgeProps) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-background"
      style={{ backgroundColor: "var(--session-accent)" }}
      title={isWorkMode ? "Focus mode" : "Rest mode"}
    >
      {isWorkMode ? "F" : "R"}
    </span>
  );
}
