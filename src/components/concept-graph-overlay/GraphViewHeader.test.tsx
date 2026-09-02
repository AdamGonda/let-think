import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphViewHeader } from "./GraphViewHeader";

const base = {
  projectName: "YouTube",
  sessionTitle: "New session",
  batchCount: 3,
  selectedBatchIndex: 0,
  onSelectBatch: vi.fn(),
  hasChatHistory: true,
  onSessionViewChange: vi.fn(),
  onHistoryOpen: vi.fn(),
  onEditorOpen: vi.fn(),
  onProjectNameClick: vi.fn(),
};

afterEach(cleanup);

describe("GraphViewHeader session view toggle", () => {
  it("selects a specific view and does not flip when clicking the active segment", () => {
    const onSessionViewChange = vi.fn();
    const { rerender, getByLabelText, queryByLabelText } = render(
      <GraphViewHeader
        {...base}
        sessionView="graph"
        onSessionViewChange={onSessionViewChange}
      />,
    );
    expect(getByLabelText("Graph").getAttribute("aria-checked")).toBe("true");
    expect(getByLabelText("Chat").getAttribute("aria-checked")).toBe("false");
    expect(getByLabelText("Canvas").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(getByLabelText("Write").getAttribute("aria-checked")).toBe(
      "false",
    );
    const history = getByLabelText("Session history");
    expect((history as HTMLButtonElement).disabled).toBe(false);
    expect(history.closest(".opacity-0")).toBeNull();
    expect(queryByLabelText("Previous step")).toBeTruthy();

    fireEvent.click(getByLabelText("Graph"));
    expect(onSessionViewChange).not.toHaveBeenCalled();

    fireEvent.click(getByLabelText("Chat"));
    expect(onSessionViewChange).toHaveBeenCalledWith("chat");

    fireEvent.click(getByLabelText("Canvas"));
    expect(onSessionViewChange).toHaveBeenCalledWith("canvas");

    const onEditorOpen = vi.fn();
    rerender(
      <GraphViewHeader
        {...base}
        sessionView="graph"
        onSessionViewChange={onSessionViewChange}
        onEditorOpen={onEditorOpen}
      />,
    );
    fireEvent.click(getByLabelText("Write"));
    expect(onEditorOpen).toHaveBeenCalled();
    expect(onSessionViewChange).toHaveBeenCalledTimes(2);

    rerender(
      <GraphViewHeader
        {...base}
        sessionView="chat"
        onSessionViewChange={onSessionViewChange}
      />,
    );
    expect(getByLabelText("Chat").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(getByLabelText("Session history").closest(".opacity-0")).toBeTruthy();
    expect(queryByLabelText("Previous step")).toBeNull();
    expect(getByLabelText("Write").getAttribute("aria-checked")).toBe(
      "false",
    );

    rerender(
      <GraphViewHeader
        {...base}
        sessionView="canvas"
        onSessionViewChange={onSessionViewChange}
      />,
    );
    expect(getByLabelText("Canvas").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(queryByLabelText("Eraser")).toBeNull();
    expect(queryByLabelText("Session history")).toBeNull();
    expect(queryByLabelText("Previous step")).toBeNull();
    expect(getByLabelText("Write").getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("shows the file title as a breadcrumb, not a chat switcher", () => {
    const { getByText, queryByLabelText } = render(
      <GraphViewHeader {...base} sessionView="chat" />,
    );
    expect(getByText("YouTube")).toBeTruthy();
    expect(getByText("New session")).toBeTruthy();
    expect(queryByLabelText("New session. Switch chat")).toBeNull();
  });
});
