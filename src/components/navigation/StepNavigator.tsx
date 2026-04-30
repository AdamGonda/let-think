import { Button } from "@/components/ui/button";
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
  isDisabled?: boolean;
}

const navButtonClass =
  "size-7 shrink-0 rounded-none border-0";

export function StepNavigator({
  totalSteps,
  selectedIndex,
  onSelect,
  isDisabled = false,
}: StepNavigatorProps) {

  if (totalSteps <= 1) {
    return null;
  }
  
  return (
    <div
      className="relative grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-lg border border-border bg-muted/30 dark:bg-input/20"
      aria-disabled={isDisabled || undefined}
    >
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          onClick={() => onSelect(0)}
          disabled={isDisabled || selectedIndex <= 0}
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
          disabled={isDisabled || selectedIndex <= 0}
          title="Previous step"
          aria-label="Previous step"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </Button>
      </div>
      <div className="flex h-7 min-w-0 items-center justify-center px-2">
        <PaginationDots
          currentIndex={selectedIndex}
          totalItems={totalSteps}
          onSelect={onSelect}
          isDisabled={isDisabled}
        />
      </div>
      <div className="flex items-center justify-start">
        <Button
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          onClick={() => onSelect(Math.min(totalSteps - 1, selectedIndex + 1))}
          disabled={isDisabled || selectedIndex >= totalSteps - 1}
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
          disabled={isDisabled || selectedIndex >= totalSteps - 1}
          title="Last step"
          aria-label="Last step"
        >
          <ChevronsRight size={18} strokeWidth={2} />
        </Button>
      </div>
      {isDisabled ? (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
