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
});
