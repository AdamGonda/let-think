import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

const KEYBOARD_STEP_PX = 40;
/** Horizontal margin (page padding + breathing room) reserved outside the column while dragging. */
const VIEWPORT_MARGIN_PX = 64;

type MainColumnWidthHandleProps = {
  width: number;
  min: number;
  max: number;
  onWidthChange: (width: number) => void;
};

/**
 * Vertical drag handle on the writing column's left edge (right is the scrollbar).
 * The column is centered (`mx-auto`), so moving the edge by `dx` grows the column by `2 * dx`.
 */
export function MainColumnWidthHandle({
  width,
  min,
  max,
  onWidthChange,
}: MainColumnWidthHandleProps) {
  const [dragging, setDragging] = useState(false);
  /** Live listeners for the drag in progress, so they can be torn down from either handler. */
  const activeDragListenersRef = useRef<{
    onMove: (e: PointerEvent) => void;
    onUp: () => void;
  } | null>(null);

  const clampToViewport = useCallback(
    (next: number) => {
      const viewportLimit = Math.max(min, window.innerWidth - VIEWPORT_MARGIN_PX);
      return Math.min(max, viewportLimit, Math.max(min, next));
    },
    [min, max],
  );

  /** Tear down a drag left in progress if the handle unmounts mid-drag. */
  useEffect(() => {
    return () => {
      const active = activeDragListenersRef.current;
      if (!active) return;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.removeEventListener("pointermove", active.onMove);
      window.removeEventListener("pointerup", active.onUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startWidth = width;
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvent: PointerEvent) => {
      onWidthChange(clampToViewport(startWidth + (startX - moveEvent.clientX) * 2));
    };
    const onUp = () => {
      setDragging(false);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      activeDragListenersRef.current = null;
    };
    activeDragListenersRef.current = { onMove, onUp };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onWidthChange(clampToViewport(width + KEYBOARD_STEP_PX));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onWidthChange(clampToViewport(width - KEYBOARD_STEP_PX));
    } else if (e.key === "Home") {
      e.preventDefault();
      onWidthChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onWidthChange(max);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize writing column width"
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className="group absolute top-2 -left-3 z-10 flex h-24 w-4 touch-none items-start justify-center cursor-col-resize focus:outline-none"
    >
      <div
        className={clsx(
          "flex gap-0.5 transition-opacity duration-200",
          dragging
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        <div className="h-16 w-0.5 rounded-full bg-foreground/40" />
        <div className="h-16 w-0.5 rounded-full bg-foreground/40" />
      </div>
    </div>
  );
}
