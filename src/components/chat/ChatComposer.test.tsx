import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function mockComposerLayout() {
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 24,
    right: 120,
    width: 120,
    height: 24,
    toJSON: () => {},
  };
  const rects = [rect] as unknown as DOMRectList;
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(rects);
}

describe("ChatComposer chrome", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("puts the caret after existing @ refs when auto-focusing", () => {
    mockComposerLayout();
    const { container } = render(
      <ChatComposer {...base} autoFocus input="@4 " />,
    );
    const ta = container.querySelector("textarea");
    expect(ta).toBeTruthy();
    expect(ta!.selectionStart).toBe(3);
    expect(ta!.selectionEnd).toBe(3);
  });
});
