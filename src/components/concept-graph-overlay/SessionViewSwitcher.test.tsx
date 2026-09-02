import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionViewSwitcher } from "./SessionViewSwitcher";

afterEach(cleanup);

describe("SessionViewSwitcher", () => {
  it("selects a specific view and does not fire when clicking the active segment", () => {
    const onChange = vi.fn();
    const { rerender, getByLabelText, getAllByRole } = render(
      <SessionViewSwitcher selected="graph" onChange={onChange} />,
    );
    expect(
      getAllByRole("radio").map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Canvas", "Chat", "Graph", "Words"]);
    expect(getByLabelText("Graph").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(getByLabelText("Chat").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(getByLabelText("Canvas").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(getByLabelText("Words").getAttribute("aria-checked")).toBe(
      "false",
    );

    fireEvent.click(getByLabelText("Graph"));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(getByLabelText("Chat"));
    expect(onChange).toHaveBeenCalledWith("chat");
    fireEvent.click(getByLabelText("Canvas"));
    expect(onChange).toHaveBeenCalledWith("canvas");
    fireEvent.click(getByLabelText("Words"));
    expect(onChange).toHaveBeenCalledWith("file");

    rerender(<SessionViewSwitcher selected="file" onChange={onChange} />);
    expect(getByLabelText("Words").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(getByLabelText("Graph").getAttribute("aria-checked")).toBe(
      "false",
    );

    onChange.mockClear();
    fireEvent.click(getByLabelText("Words"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(getByLabelText("Graph"));
    expect(onChange).toHaveBeenCalledWith("graph");
  });

  it("keeps each hover label on its own button", () => {
    const { getByLabelText } = render(
      <SessionViewSwitcher selected="canvas" onChange={() => {}} />,
    );
    const canvas = getByLabelText("Canvas");
    fireEvent.mouseEnter(canvas);
    expect(canvas.querySelector("[role='tooltip']")?.textContent).toBe(
      "Canvas",
    );
    expect(canvas.querySelector("[role='tooltip']")?.className).toContain(
      "block",
    );
    const file = getByLabelText("Words");
    fireEvent.mouseEnter(file);
    expect(file.querySelector("[role='tooltip']")?.textContent).toBe(
      "Words",
    );
    expect(canvas.querySelector("[role='tooltip']")?.className).toContain(
      "hidden",
    );
    expect(canvas.contains(file.querySelector("[role='tooltip']"))).toBe(
      false,
    );
  });
});
