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
  it("uses a 3-column grid on wide viewports", () => {
    const { container } = render(<ConceptGraphBatchGrid {...base} />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "lg:grid-cols-3",
    );
  });
});
