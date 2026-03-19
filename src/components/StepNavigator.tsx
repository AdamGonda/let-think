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

export function StepNavigator({
  totalSteps,
  selectedIndex,
  onSelect,
}: StepNavigatorProps) {
  return (
    <div
      data-slot=" button-group"
      className="relative flex items-center border border-border rounded-lg bg-background dark:bg-input/30"
    >
      {selectedIndex > 0 && (
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute left-[-28px] rounded-l-lg rounded-r-none border-0 border-r border-border"
          onClick={() => onSelect(0)}
          title="First step"
          aria-label="First step"
        >
          <ChevronsLeft size={20} strokeWidth={2} />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        className={`rounded-none border-0 border-r border-border ${selectedIndex <= 0 ? "rounded-l-lg" : ""}`}
        onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
        disabled={selectedIndex <= 0}
        title="Previous step"
        aria-label="Previous step"
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </Button>
      <div className="h-7 px-2 min-w-28 flex items-center justify-center shrink-0">
        <PaginationDots
          currentIndex={selectedIndex}
          totalItems={totalSteps}
          onSelect={onSelect}
        />
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        className={
          selectedIndex >= totalSteps - 1
            ? "rounded-r-lg rounded-l-none border-0"
            : "rounded-none border-0 border-r border-border"
        }
        onClick={() => onSelect(Math.min(totalSteps - 1, selectedIndex + 1))}
        disabled={selectedIndex >= totalSteps - 1}
        title="Next step"
        aria-label="Next step"
      >
        <ChevronRight size={20} strokeWidth={2} />
      </Button>
      {selectedIndex < totalSteps - 1 && (
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute right-[-28px] rounded-r-lg rounded-l-none border-0 border-l border-border"
          onClick={() => onSelect(totalSteps - 1)}
          title="Last step"
          aria-label="Last step"
        >
          <ChevronsRight size={20} strokeWidth={2} />
        </Button>
      )}
    </div>
  );
}
