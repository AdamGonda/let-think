import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionCanvas } from "./SessionCanvas";

afterEach(cleanup);

describe("SessionCanvas toolbar", () => {
  it("hosts the canvas tools overlay with pen selected", () => {
    const { getByLabelText, queryByLabelText, queryByTestId } = render(
      <SessionCanvas active />,
    );
    expect(getByLabelText("Drawing canvas")).toBeTruthy();
    expect(getByLabelText("Canvas tools")).toBeTruthy();
    expect(getByLabelText("Pen").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Eraser").getAttribute("aria-checked")).toBe("false");
    expect(getByLabelText("Text")).toBeTruthy();
    expect(getByLabelText("Pen size")).toBeTruthy();
    expect(queryByLabelText("Line")).toBeNull();
    expect(queryByLabelText("Rectangle")).toBeNull();
    expect(queryByLabelText("Ellipse")).toBeNull();
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

  it("updates the erase ring from the size slider", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Eraser"));
    fireEvent.change(getByLabelText("Eraser size"), { target: { value: "80" } });
    fireEvent.pointerMove(getByLabelText("Drawing canvas"), {
      clientX: 80,
      clientY: 40,
    });
    const ring = getByTestId("erase-radius");
    expect(ring.style.width).toBe("80px");
    expect(ring.style.height).toBe("80px");
  });

  it("pinch-zooms the camera so the eraser ring scales", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 100, clientY: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 200, clientY: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 200, clientY: 0 });
    expect(canvas.getAttribute("data-viewport-scale")).toBe("2");
    fireEvent.click(getByLabelText("Eraser"));
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 40 });
    const ring = getByTestId("erase-radius");
    expect(ring.style.width).toBe("80px");
  });

  it("cmd-drag pans the camera so the eraser ring shifts", () => {
    const { getByLabelText } = render(<SessionCanvas active />);
    const canvas = getByLabelText("Drawing canvas");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta" }));
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      clientX: 20,
      clientY: 0,
    });
    expect(canvas.getAttribute("data-viewport-x")).toBe("20");
  });

  it("reopens committed text for editing", () => {
    const { getByLabelText, queryByLabelText } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Text"));
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    const box = getByLabelText("Canvas text");
    box.textContent = "hello";
    fireEvent.blur(box);
    expect(queryByLabelText("Canvas text")).toBeNull();
    fireEvent.pointerDown(canvas, {
      pointerId: 2,
      clientX: 24,
      clientY: 24,
    });
    fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 24, clientY: 24 });
    expect(getByLabelText("Canvas text").textContent).toBe("hello");
  });
});
