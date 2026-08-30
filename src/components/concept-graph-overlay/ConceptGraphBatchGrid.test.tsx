import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConceptGraphBatchGrid } from "./ConceptGraphBatchGrid";

const base = {
  showSwipeAnimation: false,
  swipeDirection: "left" as const,
  showLoadingCards: false,
  currentBatchNodes: [],
  loadingBatchNodes: [],
  skeletonSlotIndices: [],
  isLatestBatch: true,
  interactionBlocked: false,
  hoveredNodeId: null,
  copiedNodeId: null,
  onHoverStart: vi.fn(),
  onHoverEnd: vi.fn(),
  onAnimationEnd: vi.fn(),
};

describe("ConceptGraphBatchGrid", () => {
  it("keeps the under-1024 2×3 grid when compactGrid is set", () => {
    const { container, rerender } = render(<ConceptGraphBatchGrid {...base} />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "lg:grid-cols-3",
    );

    rerender(<ConceptGraphBatchGrid {...base} compactGrid />);
    expect((container.firstChild as HTMLElement).className).not.toContain(
      "lg:grid-cols-3",
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      "sm:grid-cols-2",
    );
  });
});
