import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionCanvas } from "./SessionCanvas";
import type { Id } from "../../../convex/_generated/dataModel";

const updateCanvas = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => updateCanvas,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  updateCanvas.mockClear();
});

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
    expect(getByLabelText("Rectangle")).toBeTruthy();
    expect(getByLabelText("Ellipse")).toBeTruthy();
    expect(queryByLabelText("Line")).toBeNull();
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

describe("SessionCanvas persist", () => {
  it("saves a committed stroke to the session", () => {
    vi.useFakeTimers();
    const sessionId = "jd7sessioncanvas" as Id<"sessions">;
    const { getByLabelText } = render(
      <SessionCanvas active sessionId={sessionId} />,
    );
    const canvas = getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      clientX: 24,
      clientY: 18,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: 24,
      clientY: 18,
    });
    expect(updateCanvas).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(updateCanvas).toHaveBeenCalledTimes(1);
    expect(updateCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        strokes: expect.arrayContaining([
          expect.objectContaining({ kind: "draw" }),
        ]),
      }),
    );
  });

  it("saves committed text to the session", () => {
    vi.useFakeTimers();
    const sessionId = "jd7sessioncanvas" as Id<"sessions">;
    const { getByLabelText, queryByLabelText } = render(
      <SessionCanvas active sessionId={sessionId} />,
    );
    placeHello(getByLabelText, queryByLabelText);
    expect(updateCanvas).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(updateCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        strokes: expect.arrayContaining([
          expect.objectContaining({ kind: "text", text: "hello" }),
        ]),
      }),
    );
  });
});

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
    const { getByLabelText, queryByLabelText } = render(
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
    expect(box.textContent).toBe("hello");
    expect(box.style.left).toBe("50px");
    expect(box.style.top).toBe("30px");
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
