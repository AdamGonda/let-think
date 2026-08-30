import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./ChatComposer";

const base = {
  input: "",
  setInput: vi.fn(),
  placeholder: "Type...",
  numberedConcepts: [],
  isDisabled: false,
  isLoading: false,
  sessionLoadingFrame: false,
  onSubmit: vi.fn(),
  autoFocus: false,
};

describe("ChatComposer chrome", () => {
  it("uses island chrome by default and dock chrome without the floating shell", () => {
    const { rerender, container } = render(<ChatComposer {...base} />);
    expect(
      container.querySelector("[data-composer-chrome='island']"),
    ).toBeTruthy();
    expect(container.querySelector(".rounded-t-2xl")).toBeTruthy();

    rerender(<ChatComposer {...base} chrome="dock" />);
    expect(container.querySelector("[data-composer-chrome='dock']")).toBeTruthy();
    expect(container.querySelector(".rounded-t-2xl")).toBeNull();
  });
});
