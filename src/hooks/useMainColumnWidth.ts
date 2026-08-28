import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { layout } from "@/config";
import {
  getStoredMainColumnWidth,
  setStoredMainColumnWidth,
} from "@/lib/mainColumnWidthStorage";

const PERSIST_DEBOUNCE_MS = 200;

function clampMainColumnWidth(width: number): number {
  return Math.min(
    layout.mainColumnWidthMaxPx,
    Math.max(layout.mainColumnWidthMinPx, width),
  );
}

export type MainColumnWidthControls = {
  width: number;
  setWidth: (width: number) => void;
  min: number;
  max: number;
};

/**
 * Applies the persisted (or default) writing-column width as a CSS variable on document
 * root, read by every consumer of `layout.mainColumnMaxWidthClass`. Call once near the app
 * root — see `useSessionAccentCssVars` for the same document-root-variable pattern.
 */
export function useMainColumnWidth(): MainColumnWidthControls {
  const [width, setWidthState] = useState(() =>
    clampMainColumnWidth(
      getStoredMainColumnWidth() ?? layout.mainColumnWidthDefaultPx,
    ),
  );

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      layout.mainColumnWidthCssVar,
      `${width}px`,
    );
  }, [width]);

  useEffect(() => {
    const id = window.setTimeout(
      () => setStoredMainColumnWidth(width),
      PERSIST_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [width]);

  const setWidth = useCallback((next: number) => {
    setWidthState(clampMainColumnWidth(next));
  }, []);

  return {
    width,
    setWidth,
    min: layout.mainColumnWidthMinPx,
    max: layout.mainColumnWidthMaxPx,
  };
}
