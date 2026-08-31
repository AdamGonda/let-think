import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppContentGraphSurface } from "./AppContentGraphSurface";

vi.mock("../chat/SessionChatThread", () => ({
  SessionChatThread: () => <div data-testid="chat-thread" />,
}));

vi.mock("../concept-graph-overlay/ConceptGraphOverlay", () => ({
  ConceptGraphOverlay: () => <div data-testid="graph-cards" />,
}));

vi.mock("../session-canvas/SessionCanvas", () => ({
  SessionCanvas: () => <canvas aria-label="Drawing canvas" />,
}));

afterEach(cleanup);

const base = {
  activeSessionId: null,
  activeSessionTitle: undefined,
  activeProjectName: undefined,
  batchesLength: 0,
  selectedBatchIndex: 0,
  hasChatHistory: false,
  chatLoading: false,
  chatThreadLoading: false,
  graphShowLoadingCards: false,
  graphInteractionBlocked: false,
  graphLoadingStartBatchLength: 0,
  conceptGraph: null,
  chatVisible: true,
  sessionPastFrame: false,
  referencedConceptIds: new Set<string>(),
  graphComposer: <div data-testid="graph-composer" />,
  chatComposer: <div data-testid="chat-composer" />,
  onSelectBatch: vi.fn(),
  onSessionViewChange: vi.fn(),
  onHistoryOpen: vi.fn(),
  onEditorOpen: vi.fn(),
  onProjectsRootClick: vi.fn(),
  onProjectNameClick: vi.fn(),
  fileChats: [],
  activeChatSessionId: null,
  onSelectChatSession: vi.fn(),
  onNewChat: vi.fn(),
};

describe("AppContentGraphSurface session views", () => {
  it("swaps graph for a full chat view", () => {
    const { getByTestId, queryByTestId, getByLabelText, rerender } = render(
      <AppContentGraphSurface {...base} sessionView="graph" />,
    );
    expect(getByTestId("graph-cards")).toBeTruthy();
    expect(getByTestId("graph-composer")).toBeTruthy();
    expect(getByTestId("graph-cards").closest(".hidden")).toBeNull();
    expect(queryByTestId("chat-thread")).toBeNull();
    expect(queryByTestId("chat-composer")).toBeNull();

    rerender(<AppContentGraphSurface {...base} sessionView="chat" />);
    expect(getByTestId("graph-cards").closest(".hidden")).toBeTruthy();
    expect(queryByTestId("graph-composer")?.closest(".hidden")).toBeTruthy();
    expect(getByTestId("chat-thread")).toBeTruthy();
    expect(getByTestId("chat-composer")).toBeTruthy();
    expect(getByLabelText("New chat")).toBeTruthy();
  });

  it("shows a drawing canvas without composers", () => {
    const { getByLabelText, getByTestId, queryByTestId, queryByLabelText } =
      render(<AppContentGraphSurface {...base} sessionView="canvas" />);
    expect(getByLabelText("Drawing canvas").closest(".hidden")).toBeNull();
    expect(getByTestId("graph-cards").closest(".hidden")).toBeTruthy();
    expect(getByTestId("graph-composer").closest(".hidden")).toBeTruthy();
    expect(queryByTestId("chat-thread")).toBeNull();
    expect(queryByTestId("chat-composer")).toBeNull();
    expect(queryByLabelText("New chat")).toBeNull();
  });
});
