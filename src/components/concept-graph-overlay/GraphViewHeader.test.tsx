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
  onProjectsRootClick: vi.fn(),
  onProjectNameClick: vi.fn(),
};

afterEach(cleanup);

describe("GraphViewHeader session view toggle", () => {
  it("toggles session view; chat hides step nav and keeps history in layout", () => {
    const { rerender, getByLabelText, queryByLabelText } = render(
      <GraphViewHeader {...base} sessionView="graph" />,
    );
    expect(getByLabelText("Switch to chat view")).toBeTruthy();
    const history = getByLabelText("Session history");
    expect((history as HTMLButtonElement).disabled).toBe(false);
    expect(history.closest(".opacity-0")).toBeNull();
    expect(queryByLabelText("Previous step")).toBeTruthy();

    fireEvent.click(getByLabelText("Switch to chat view"));
    expect(base.onSessionViewChange).toHaveBeenCalledWith("chat");

    rerender(<GraphViewHeader {...base} sessionView="chat" />);
    expect(getByLabelText("Switch to graph view")).toBeTruthy();
    expect(getByLabelText("Session history").closest(".opacity-0")).toBeTruthy();
    expect(queryByLabelText("New chat")).toBeNull();
    expect(queryByLabelText("Previous step")).toBeNull();
    expect(getByLabelText("Open file")).toBeTruthy();

    fireEvent.click(getByLabelText("Switch to graph view"));
    expect(base.onSessionViewChange).toHaveBeenCalledWith("graph");
  });

  it("shows the file title as a breadcrumb, not a chat switcher", () => {
    const { getByText, queryByLabelText } = render(
      <GraphViewHeader {...base} sessionView="chat" />,
    );
    expect(getByText("New session")).toBeTruthy();
    expect(queryByLabelText("New session. Switch chat")).toBeNull();
  });
});
