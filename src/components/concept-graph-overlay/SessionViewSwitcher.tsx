import {
  FileText,
  LayoutGrid,
  MessageSquare,
  Paintbrush,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/machines/appUiTypes";
import { useState } from "react";

export type WorkspaceChromeView = SessionView | "file";

const VIEW_OPTIONS: ReadonlyArray<{
  view: WorkspaceChromeView;
  label: string;
  Icon: LucideIcon;
  tour?: string;
}> = [
  { view: "canvas", label: "Canvas view", Icon: Paintbrush },
  { view: "chat", label: "Chat view", Icon: MessageSquare },
  { view: "graph", label: "Graph view", Icon: LayoutGrid },
  { view: "file", label: "File view", Icon: FileText, tour: "notes-btn" },
];

const HIGHLIGHT_TRANSLATE = [
  "translate-x-0",
  "translate-x-full",
  "translate-x-[200%]",
  "translate-x-[300%]",
] as const;

type SessionViewSwitcherProps = {
  selected: WorkspaceChromeView;
  onChange: (view: WorkspaceChromeView) => void;
};

export function SessionViewSwitcher({
  selected,
  onChange,
}: SessionViewSwitcherProps) {
  const selectedIndex = Math.max(
    0,
    VIEW_OPTIONS.findIndex((option) => option.view === selected),
  );
  const [hovered, setHovered] = useState<WorkspaceChromeView | null>(null);

  return (
    <div
      role="radiogroup"
      aria-label="Session view"
      className="relative flex h-7 w-[7rem] shrink-0 overflow-visible rounded-[min(var(--radius-md),12px)] border border-border bg-background dark:border-input dark:bg-input/30"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={cn(
            "absolute inset-0 w-1/4 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
            HIGHLIGHT_TRANSLATE[selectedIndex],
          )}
        />
      </span>
      {VIEW_OPTIONS.map(({ view, label, Icon, tour }) => {
        const isSelected = selected === view;
        return (
          <button
            key={view}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            data-tour={tour}
            className={cn(
              "relative z-10 flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-75 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isSelected ? "text-foreground" : "text-muted-foreground/55",
            )}
            onMouseEnter={() => setHovered(view)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (view !== selected) onChange(view);
            }}
          >
            <Icon className={cn("size-4", isSelected && "fill-current")} />
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium leading-none whitespace-nowrap text-background shadow-md",
                hovered === view ? "block" : "hidden",
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
