import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionCanvas } from "./SessionCanvas";

afterEach(cleanup);

describe("SessionCanvas toolbar", () => {
  it("hosts the canvas tools overlay with pen selected", () => {
    const { getByLabelText } = render(<SessionCanvas active />);
    expect(getByLabelText("Drawing canvas")).toBeTruthy();
    expect(getByLabelText("Canvas tools")).toBeTruthy();
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("false");
    expect(getByLabelText("Text")).toBeTruthy();
    expect(getByLabelText("Rectangle")).toBeTruthy();
    expect(getByLabelText("Ellipse")).toBeTruthy();
    expect(getByLabelText("Line")).toBeTruthy();
  });
});
