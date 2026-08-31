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
    const { getByLabelText } = render(<Harness />);
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("false");

    fireEvent.click(getByLabelText("Eraser"));
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("false");

    fireEvent.click(getByLabelText("Text"));
    expect(getByLabelText("Text").getAttribute("aria-checked")).toBe("true");

    fireEvent.click(getByLabelText("Rectangle"));
    expect(getByLabelText("Rectangle").getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.click(getByLabelText("Ellipse"));
    expect(getByLabelText("Ellipse").getAttribute("aria-checked")).toBe("true");

    fireEvent.click(getByLabelText("Line"));
    expect(getByLabelText("Line").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("false");
  });
});
