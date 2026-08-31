import {
  FileText,
  LayoutGrid,
  MessageSquare,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/machines/appUiTypes";

export type WorkspaceChromeView = SessionView | "file";

const VIEW_OPTIONS: ReadonlyArray<{
  view: WorkspaceChromeView;
  label: string;
  Icon: LucideIcon;
  tour?: string;
}> = [
  { view: "graph", label: "Graph view", Icon: LayoutGrid },
  { view: "chat", label: "Chat view", Icon: MessageSquare },
  { view: "canvas", label: "Canvas view", Icon: Pencil },
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

  return (
    <div
      role="radiogroup"
      aria-label="Session view"
      className="relative flex h-7 w-[7rem] shrink-0 overflow-hidden rounded-[min(var(--radius-md),12px)] border border-border bg-background dark:border-input dark:bg-input/30"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 w-1/4 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
          HIGHLIGHT_TRANSLATE[selectedIndex],
        )}
      />
      {VIEW_OPTIONS.map(({ view, label, Icon, tour }) => {
        const isSelected = selected === view;
        return (
          <button
            key={view}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            title={label}
            data-tour={tour}
            className={cn(
              "relative z-10 flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-75 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isSelected ? "text-foreground" : "text-muted-foreground/55",
            )}
            onClick={() => {
              if (view !== selected) onChange(view);
            }}
          >
            <Icon className={cn("size-4", isSelected && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
