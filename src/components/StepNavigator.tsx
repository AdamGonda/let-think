import { Button } from "./ui/button";
import { PaginationDots } from "./PaginationDots";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface StepNavigatorProps {
  totalSteps: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const navButtonClass =
  "size-7 shrink-0 rounded-none border-0";

export function StepNavigator({
  totalSteps,
  selectedIndex,
  onSelect,
}: StepNavigatorProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/30 dark:bg-input/20 overflow-hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        className={navButtonClass}
        onClick={() => onSelect(0)}
        disabled={selectedIndex <= 0}
        title="First step"
        aria-label="First step"
      >
        <ChevronsLeft size={18} strokeWidth={2} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={navButtonClass}
        onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
        disabled={selectedIndex <= 0}
        title="Previous step"
        aria-label="Previous step"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </Button>
      <div className="h-7 px-2 min-w-20 flex items-center justify-center shrink-0">
        <PaginationDots
          currentIndex={selectedIndex}
          totalItems={totalSteps}
          onSelect={onSelect}
        />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className={navButtonClass}
        onClick={() => onSelect(Math.min(totalSteps - 1, selectedIndex + 1))}
        disabled={selectedIndex >= totalSteps - 1}
        title="Next step"
        aria-label="Next step"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={navButtonClass}
        onClick={() => onSelect(totalSteps - 1)}
        disabled={selectedIndex >= totalSteps - 1}
        title="Last step"
        aria-label="Last step"
      >
        <ChevronsRight size={18} strokeWidth={2} />
      </Button>
    </div>
  );
}
