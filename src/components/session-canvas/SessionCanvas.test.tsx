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

  it("hides the ink size slider while the text tool is selected", () => {
    const { getByLabelText, queryByLabelText } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Text"));
    expect(queryByLabelText("Pen size")).toBeNull();
    expect(queryByLabelText("Eraser size")).toBeNull();
    expect(queryByLabelText("Text size")).toBeNull();
    expect(getByLabelText("Ink color")).toBeTruthy();
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
    const { getByLabelText, getByTestId, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    fireEvent.click(getByLabelText("Text"));
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    const box = getByLabelText("Canvas text");
    expect(getByTestId("canvas-text-frame")).toBeTruthy();
    box.textContent = "hello";
    const handle = getByLabelText("Resize text bottom-right");
    fireEvent.pointerDown(handle, { pointerId: 9, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(handle, { pointerId: 9, clientX: 80, clientY: 80 });
    fireEvent.pointerUp(handle, { pointerId: 9, clientX: 80, clientY: 80 });
    expect(box.style.fontSize).toBe("96px");
    fireEvent.blur(box);
    expect(queryByLabelText("Canvas text")).toBeNull();
    doubleClickCanvas(canvas, 24, 24);
    expect(getByLabelText("Canvas text").textContent).toBe("hello");
  });

  it("drags selected text from the text box after a short drag", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Text"));
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    const frame = getByTestId("canvas-text-frame");
    const box = getByLabelText("Canvas text");
    fireEvent.pointerDown(box, { pointerId: 8, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(box, { pointerId: 8, clientX: 50, clientY: 30 });
    fireEvent.pointerUp(box, { pointerId: 8, clientX: 50, clientY: 30 });
    expect(frame.style.left).toBe("50px");
    expect(frame.style.top).toBe("30px");
  });

  it("drags selected text from the move ring", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    fireEvent.click(getByLabelText("Text"));
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    const frame = getByTestId("canvas-text-frame");
    expect(frame.style.left).toBe("20px");
    expect(frame.style.top).toBe("20px");
    const handle = getByLabelText("Move text");
    fireEvent.pointerDown(handle, { pointerId: 8, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 8, clientX: 50, clientY: 30 });
    fireEvent.pointerUp(handle, { pointerId: 8, clientX: 50, clientY: 30 });
    expect(frame.style.left).toBe("50px");
    expect(frame.style.top).toBe("30px");
  });

  it("marks the slider and toolbar as canvas chrome", () => {
    const { getByLabelText, getByTestId } = render(<SessionCanvas active />);
    expect(getByLabelText("Canvas tools").hasAttribute("data-canvas-chrome")).toBe(
      true,
    );
    expect(getByLabelText("Pen size").closest("[data-canvas-chrome]")).toBeTruthy();
    const palette = getByLabelText("Ink color");
    expect(palette.hasAttribute("data-canvas-chrome")).toBe(true);
    expect(palette.className).not.toContain("right-3");
    const stack = palette.parentElement;
    expect(stack?.className).toContain("left-3");
    expect(stack?.className).not.toContain("right-3");
    expect(stack?.contains(getByLabelText("Pen size"))).toBe(true);
    const paletteIndex = [...(stack?.children ?? [])].indexOf(palette);
    const sliderIndex = [...(stack?.children ?? [])].indexOf(
      getByLabelText("Pen size").closest("[data-canvas-chrome]") as HTMLElement,
    );
    expect(paletteIndex).toBeLessThan(sliderIndex);
    expect(getByLabelText("White").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(getByLabelText("Blue"));
    expect(getByLabelText("Blue").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("White").getAttribute("aria-checked")).toBe("false");
    const thumb = getByTestId("size-slider-thumb");
    expect(thumb.className).toContain("left-1/2");
    expect(thumb.className).toContain("-translate-x-1/2");
  });
});

function doubleClickCanvas(
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
) {
  fireEvent.pointerDown(canvas, { pointerId: 2, clientX, clientY });
  fireEvent.pointerUp(canvas, { pointerId: 2, clientX, clientY });
  fireEvent.pointerDown(canvas, { pointerId: 3, clientX, clientY });
  fireEvent.pointerUp(canvas, { pointerId: 3, clientX, clientY });
}

function placeHello(
  getByLabelText: (label: string) => HTMLElement,
  queryByLabelText: (label: string) => HTMLElement | null,
): HTMLElement {
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
  return canvas;
}

describe("SessionCanvas committed text", () => {
  it("reopens committed text for editing on double-click", () => {
    const { getByLabelText, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    const canvas = placeHello(getByLabelText, queryByLabelText);
    doubleClickCanvas(canvas, 24, 24);
    expect(getByLabelText("Canvas text").textContent).toBe("hello");
  });

  it("commits edited text after a double-click", () => {
    const { getByLabelText, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    const canvas = placeHello(getByLabelText, queryByLabelText);
    doubleClickCanvas(canvas, 24, 24);
    const box = getByLabelText("Canvas text");
    box.textContent = "hello world";
    fireEvent.blur(box);
    expect(queryByLabelText("Canvas text")).toBeNull();
    doubleClickCanvas(canvas, 24, 24);
    expect(getByLabelText("Canvas text").textContent).toBe("hello world");
  });

  it("does not reopen committed text on a single click", () => {
    const { getByLabelText, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    const canvas = placeHello(getByLabelText, queryByLabelText);
    fireEvent.pointerDown(canvas, {
      pointerId: 2,
      clientX: 24,
      clientY: 24,
    });
    fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 24, clientY: 24 });
    expect(queryByLabelText("Canvas text")).toBeNull();
  });

  it("drags committed text then opens the editor at the new location", () => {
    const { getByLabelText, getByTestId, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    const canvas = placeHello(getByLabelText, queryByLabelText);
    fireEvent.pointerDown(canvas, {
      pointerId: 8,
      clientX: 24,
      clientY: 24,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 8,
      clientX: 54,
      clientY: 34,
    });
    fireEvent.pointerUp(canvas, { pointerId: 8, clientX: 54, clientY: 34 });
    expect(queryByLabelText("Canvas text")).toBeNull();
    doubleClickCanvas(canvas, 54, 34);
    const box = getByLabelText("Canvas text");
    const frame = getByTestId("canvas-text-frame");
    expect(box.textContent).toBe("hello");
    expect(frame.style.left).toBe("50px");
    expect(frame.style.top).toBe("30px");
  });

  it("uses the move cursor over committed text and the text cursor on empty canvas", () => {
    const { getByLabelText, queryByLabelText } = render(
      <SessionCanvas active />,
    );
    const canvas = placeHello(getByLabelText, queryByLabelText);
    fireEvent.pointerMove(canvas, { clientX: 400, clientY: 400 });
    expect(canvas.className).toContain("cursor-text");
    expect(canvas.className).not.toContain("cursor-move");
    fireEvent.pointerMove(canvas, { clientX: 24, clientY: 24 });
    expect(canvas.className).toContain("cursor-move");
  });
});
