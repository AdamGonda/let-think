import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionViewSwitcher } from "./SessionViewSwitcher";

afterEach(cleanup);

describe("SessionViewSwitcher", () => {
  it("selects a specific view and does not fire when clicking the active segment", () => {
    const onChange = vi.fn();
    const { rerender, getByLabelText } = render(
      <SessionViewSwitcher selected="graph" onChange={onChange} />,
    );
    expect(getByLabelText("Graph view").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(getByLabelText("Chat view").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(getByLabelText("Canvas view").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(getByLabelText("File view").getAttribute("aria-checked")).toBe(
      "false",
    );

    fireEvent.click(getByLabelText("Graph view"));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(getByLabelText("Chat view"));
    expect(onChange).toHaveBeenCalledWith("chat");
    fireEvent.click(getByLabelText("Canvas view"));
    expect(onChange).toHaveBeenCalledWith("canvas");
    fireEvent.click(getByLabelText("File view"));
    expect(onChange).toHaveBeenCalledWith("file");

    rerender(<SessionViewSwitcher selected="file" onChange={onChange} />);
    expect(getByLabelText("File view").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(getByLabelText("Graph view").getAttribute("aria-checked")).toBe(
      "false",
    );

    onChange.mockClear();
    fireEvent.click(getByLabelText("File view"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(getByLabelText("Graph view"));
    expect(onChange).toHaveBeenCalledWith("graph");
  });
});
