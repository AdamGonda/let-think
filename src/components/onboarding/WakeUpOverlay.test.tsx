import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorOpenViewSwitcher } from "./WakeUpOverlay";

afterEach(cleanup);

describe("EditorOpenViewSwitcher", () => {
  it("starts on fromView then selects Write after paint", async () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      window.clearTimeout(id);
    });

    const { getByLabelText } = render(
      <EditorOpenViewSwitcher fromView="canvas" onChange={() => {}} />,
    );
    expect(getByLabelText("Draw").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Write").getAttribute("aria-checked")).toBe("false");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(getByLabelText("Write").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Draw").getAttribute("aria-checked")).toBe(
      "false",
    );

    vi.unstubAllGlobals();
  });
});
