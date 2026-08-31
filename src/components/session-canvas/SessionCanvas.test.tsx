import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionCanvas } from "./SessionCanvas";

afterEach(cleanup);

describe("SessionCanvas toolbar", () => {
  it("hosts the canvas tools overlay with pen selected", () => {
    const { getByLabelText, queryByTestId } = render(<SessionCanvas active />);
    expect(getByLabelText("Drawing canvas")).toBeTruthy();
    expect(getByLabelText("Canvas tools")).toBeTruthy();
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("false");
    expect(getByLabelText("Text")).toBeTruthy();
    expect(getByLabelText("Rectangle")).toBeTruthy();
    expect(getByLabelText("Ellipse")).toBeTruthy();
    expect(getByLabelText("Line")).toBeTruthy();
    expect(queryByTestId("erase-radius")).toBeNull();
  });

  it("shows a 40px radius ring while the eraser is selected", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Eraser"));
    fireEvent.pointerMove(getByLabelText("Drawing canvas"), {
      clientX: 80,
      clientY: 40,
    });
    const ring = getByTestId("erase-radius");
    expect(ring.style.width).toBe("40px");
    expect(ring.style.height).toBe("40px");
  });
});
