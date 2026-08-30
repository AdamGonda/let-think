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
  it("presses Graph and shows history; chat hides step nav and keeps history", () => {
    const { rerender, getByLabelText, queryByLabelText } = render(
      <GraphViewHeader {...base} sessionView="graph" />,
    );
    expect(getByLabelText("Graph view").getAttribute("aria-pressed")).toBe("true");
    expect(getByLabelText("Chat view").getAttribute("aria-pressed")).toBe("false");
    expect((getByLabelText("Session history") as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(queryByLabelText("Previous step")).toBeTruthy();

    fireEvent.click(getByLabelText("Chat view"));
    expect(base.onSessionViewChange).toHaveBeenCalledWith("chat");

    rerender(<GraphViewHeader {...base} sessionView="chat" />);
    expect(getByLabelText("Chat view").getAttribute("aria-pressed")).toBe("true");
    expect(getByLabelText("Graph view").getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(getByLabelText("Session history")).toBeTruthy();
    expect(queryByLabelText("New chat")).toBeNull();
    expect(queryByLabelText("Previous step")).toBeNull();
    expect(getByLabelText("Open file")).toBeTruthy();

    fireEvent.click(getByLabelText("Graph view"));
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
