import { fireEvent, render } from "@testing-library/react";
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

  it("shares wrap metrics between textarea and highlight mirror", () => {
    const { container } = render(<ChatComposer {...base} input="hello" />);
    const ta = container.querySelector("[data-session-input-textarea]");
    expect(ta).toBeTruthy();
    const field = ta!.parentElement;
    const mirror = field?.querySelector("div[aria-hidden]");
    expect(mirror).toBeTruthy();

    const shared = [
      "break-words",
      "whitespace-pre-wrap",
      "tracking-[0.01em]",
    ];
    for (const token of shared) {
      expect(ta!.className).toContain(token);
      expect(mirror!.className).toContain(token);
    }
    expect(ta!.className).toContain("field-sizing-content");
    expect(ta!.className).toContain("pb-2.5");
    expect(ta!.className).toContain("scroll-pb-2.5");
    expect(mirror!.className).toContain("pb-2.5");
    expect(field!.className).toContain("min-w-0");
    expect(field!.className).not.toContain("max-h-[450px]");
    expect(ta!.className).toContain("max-h-[450px]");
    expect(mirror!.textContent).toMatch(/hello\n$/);
  });
});

describe("ChatComposer @ picker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Writing on @ and Graph only when allowed", () => {
    const { rerender, getByRole, queryByRole } = render(
      <ChatComposer {...base} input="@" />,
    );
    expect(getByRole("option", { name: /Writing/ })).toBeTruthy();
    expect(queryByRole("option", { name: /Graph/ })).toBeNull();

    rerender(<ChatComposer {...base} input="@" allowGraphRef />);
    expect(getByRole("option", { name: /Graph/ })).toBeTruthy();
  });

  it("Enter inserts the highlighted token instead of submitting", () => {
    const setInput = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <ChatComposer
        {...base}
        input="@"
        setInput={setInput}
        onSubmit={onSubmit}
      />,
    );
    const ta = container.querySelector("textarea")!;
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(setInput).toHaveBeenCalledWith("@writing ");
  });
});
