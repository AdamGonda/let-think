import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { layout } from "@/config";
import { setStoredMainColumnWidth } from "@/lib/mainColumnWidthStorage";
import { useMainColumnWidth } from "./useMainColumnWidth";

function readCssVarPx(): number {
  return Number.parseFloat(
    document.documentElement.style.getPropertyValue(
      layout.mainColumnWidthCssVar,
    ),
  );
}

describe("useMainColumnWidth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the configured default width and applies it as a CSS var", () => {
    const { result } = renderHook(() => useMainColumnWidth());
    expect(result.current.width).toBe(layout.mainColumnWidthDefaultPx);
    expect(readCssVarPx()).toBe(layout.mainColumnWidthDefaultPx);
  });

  it("initializes from a stored width, clamped to [min, max]", () => {
    setStoredMainColumnWidth(1500);
    const { result } = renderHook(() => useMainColumnWidth());
    expect(result.current.width).toBe(layout.mainColumnWidthMaxPx);
  });

  it("clamps setWidth to the configured minimum and maximum", () => {
    const { result } = renderHook(() => useMainColumnWidth());

    act(() => {
      result.current.setWidth(layout.mainColumnWidthMinPx - 200);
    });
    expect(result.current.width).toBe(layout.mainColumnWidthMinPx);
    expect(readCssVarPx()).toBe(layout.mainColumnWidthMinPx);

    act(() => {
      result.current.setWidth(layout.mainColumnWidthMaxPx + 200);
    });
    expect(result.current.width).toBe(layout.mainColumnWidthMaxPx);
    expect(readCssVarPx()).toBe(layout.mainColumnWidthMaxPx);
  });

  it("persists the width to localStorage after settling, not on every change", () => {
    const { result } = renderHook(() => useMainColumnWidth());

    act(() => {
      result.current.setWidth(1000);
    });
    expect(localStorage.getItem("think-main-column-width")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(localStorage.getItem("think-main-column-width")).toBe("1000");
  });
});
