import { describe, expect, it } from "vitest";
import { sizeSliderThumbTop, sizeTaperPolygon } from "./canvasSizeSliderUtils";

describe("sizeTaperPolygon", () => {
  it("is centered and wider at the top than the bottom", () => {
    const points = sizeTaperPolygon(112, 16, 6, 2)
      .split(" ")
      .map((pair) => pair.split(",").map(Number));
    const bottomLeft = points[0];
    const topLeft = points[1];
    const topRight = points[2];
    const bottomRight = points[3];
    expect(bottomLeft).toBeDefined();
    expect(topLeft).toBeDefined();
    expect(topRight).toBeDefined();
    expect(bottomRight).toBeDefined();
    if (!bottomLeft || !topLeft || !topRight || !bottomRight) return;
    const topWidth = topRight[0]! - topLeft[0]!;
    const bottomWidth = bottomRight[0]! - bottomLeft[0]!;
    expect(bottomWidth).toBeLessThan(topWidth);
    expect(topWidth).toBeLessThan(12);
    expect((topLeft[0]! + topRight[0]!) / 2).toBe(8);
    expect((bottomLeft[0]! + bottomRight[0]!) / 2).toBe(8);
    expect(topLeft[1]).toBe(0);
    expect(bottomLeft[1]).toBe(112);
  });
});

describe("sizeSliderThumbTop", () => {
  it("puts max at the top and min at the bottom", () => {
    expect(sizeSliderThumbTop(40, 1, 40)).toBe("0%");
    expect(sizeSliderThumbTop(1, 1, 40)).toBe("100%");
    expect(sizeSliderThumbTop(20.5, 1, 40)).toBe("50%");
  });
});
