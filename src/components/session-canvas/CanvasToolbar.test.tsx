import { render, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";

function Harness({ initial = "pen" as CanvasTool }) {
  const [tool, setTool] = useState<CanvasTool>(initial);
  return <CanvasToolbar tool={tool} onToolChange={setTool} />;
}

afterEach(cleanup);

describe("CanvasToolbar", () => {
  it("defaults to pen and selects other tools", () => {
    const { getByLabelText, queryByLabelText } = render(<Harness />);
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("false");
    expect(queryByLabelText("Line")).toBeNull();
    expect(queryByLabelText("Rectangle")).toBeNull();
    expect(queryByLabelText("Ellipse")).toBeNull();

    fireEvent.click(getByLabelText("Eraser"));
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("false");

    fireEvent.click(getByLabelText("Text"));
    expect(getByLabelText("Text").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("false");
  });

  it("keeps each hover label on its own button", () => {
    const { getByLabelText } = render(<Harness />);
    const pen = getByLabelText("Pen");
    fireEvent.mouseEnter(pen);
    expect(pen.querySelector("[role='tooltip']")?.textContent).toBe("Pen");
    expect(pen.querySelector("[role='tooltip']")?.className).toContain(
      "opacity-100",
    );
    const text = getByLabelText("Text");
    fireEvent.mouseEnter(text);
    expect(text.querySelector("[role='tooltip']")?.textContent).toBe("Text");
    expect(pen.querySelector("[role='tooltip']")?.className).toContain(
      "opacity-0",
    );
    expect(pen.contains(text.querySelector("[role='tooltip']"))).toBe(false);
  });
});
