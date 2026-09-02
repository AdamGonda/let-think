import { render, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CanvasColorPalette,
  DEFAULT_INK_COLOR,
} from "./CanvasColorPalette";

function Harness({ initial = DEFAULT_INK_COLOR }) {
  const [color, setColor] = useState(initial);
  return <CanvasColorPalette color={color} onColorChange={setColor} />;
}

afterEach(cleanup);

describe("CanvasColorPalette", () => {
  it("defaults to white selected", () => {
    const { getByLabelText, getAllByRole } = render(<Harness />);
    expect(getByLabelText("Ink color").hasAttribute("data-canvas-chrome")).toBe(
      true,
    );
    expect(getByLabelText("Ink color").className).not.toContain("right-3");
    expect(getByLabelText("White").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Green").getAttribute("aria-checked")).toBe("false");
    const swatches = getAllByRole("radio");
    expect(swatches[0]?.getAttribute("aria-label")).toBe("White");
    expect(swatches.at(-1)?.getAttribute("aria-label")).toBe("Green");
  });

  it("selects another color on click", () => {
    const { getByLabelText } = render(<Harness />);
    fireEvent.click(getByLabelText("Red"));
    expect(getByLabelText("Red").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("White").getAttribute("aria-checked")).toBe("false");
  });
});
