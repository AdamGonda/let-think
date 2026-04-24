/* eslint-disable react-hooks/exhaustive-deps */

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";
import { timings } from "@/config";

const DOT_SIZE = 10;
const GAP = 6;
const DOT_STEP = DOT_SIZE + GAP;

export function PaginationDots({
  currentIndex,
  totalItems,
  onSelect,
}: {
  currentIndex: number;
  totalItems: number;
  onSelect?: (index: number) => void;
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (totalItems <= 5) {
      setOffset(0);
      return;
    }
    const startIndex = Math.max(
      0,
      Math.min(currentIndex - 2, totalItems - 5)
    );
    setOffset(startIndex * DOT_STEP);
  }, [currentIndex, totalItems]);

  const springProps = useSpring({
    to: { x: -offset },
    config: { duration: timings.paginationDotsSpringMs },
  });

  if (totalItems <= 1) {
    return null;
  }

  const dots = Array.from({ length: totalItems }, (_, i) => i);

  const dotButton = (index: number) => {
    const isActive = index === currentIndex;
    return (
      <button
        key={index}
        type="button"
        onClick={() => onSelect?.(index)}
        aria-label={`Go to step ${index + 1}`}
        aria-selected={isActive}
        title={`Step ${index + 1}`}
        className={`shrink-0 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none ${
          isActive
            ? "bg-[var(--session-accent)]"
            : "bg-zinc-300 dark:bg-white/80 hover:opacity-80"
        }`}
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          opacity: isActive ? 1 : 0.5,
        }}
      />
    );
  };

  if (totalItems <= 5) {
    return (
      <div className="flex h-7 items-center justify-center" style={{ gap: GAP }}>
        {dots.map((index) => dotButton(index))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="relative flex h-7 w-20 items-center overflow-x-clip">
        <div className="absolute top-1/2 left-0 -translate-y-1/2">
          <animated.div style={springProps}>
            <div className="flex" style={{ gap: GAP }}>
              {dots.map((index) => dotButton(index))}
            </div>
          </animated.div>
        </div>
      </div>
    </div>
  );
}
