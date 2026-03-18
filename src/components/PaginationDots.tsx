/* eslint-disable react-hooks/exhaustive-deps */

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";

const DOT_SIZE = 12;
const GAP = 10;
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
    config: { duration: 300 },
  });

  if (totalItems <= 1) {
    return null;
  }

  const dots = Array.from({ length: totalItems }, (_, i) => i);

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
      <div className="relative w-28 overflow-x-clip">
        <div
          className="absolute -top-0.5"
          style={{
            left:
              totalItems < 5 ? 56 - (totalItems * DOT_STEP) / 2 : 0,
          }}
        >
          <animated.div style={springProps}>
            <div className="flex gap-2.5 pl-1">
              {dots.map((index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSelect?.(index)}
                    aria-label={`Go to step ${index + 1}`}
                    aria-selected={isActive}
                    title={`Step ${index + 1}`}
                    className={`h-3 w-3 shrink-0 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#16171d] ${
                      isActive
                        ? "bg-red-500"
                        : "bg-white dark:bg-white/80 hover:opacity-80"
                    }`}
                    style={{
                      opacity: isActive ? 1 : 0.5,
                      transform: `scale(${isActive ? 1.2 : 1})`,
                    }}
                  />
                );
              })}
            </div>
          </animated.div>
        </div>
      </div>
    </div>
  );
}
