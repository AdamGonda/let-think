import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppContentGraphSurface } from "./AppContentGraphSurface";

vi.mock("../chat/SessionChatThread", () => ({
  SessionChatThread: () => <div data-testid="chat-thread" />,
}));

vi.mock("../concept-graph-overlay/ConceptGraphOverlay", () => ({
  ConceptGraphOverlay: () => <div data-testid="graph-cards" />,
}));

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
};

describe("AppContentGraphSurface split layout", () => {
  it("keeps the graph visible when the chat panel is open", () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <AppContentGraphSurface {...base} sessionView="graph" />,
    );
    expect(getByTestId("graph-cards")).toBeTruthy();
    expect(getByTestId("graph-composer")).toBeTruthy();
    expect(queryByTestId("chat-thread")).toBeNull();
    expect(queryByTestId("chat-composer")).toBeNull();

    rerender(<AppContentGraphSurface {...base} sessionView="chat" />);
    const graph = getByTestId("graph-cards");
    const chat = getByTestId("chat-thread");
    expect(graph).toBeTruthy();
    expect(getByTestId("graph-composer")).toBeTruthy();
    expect(chat).toBeTruthy();
    expect(getByTestId("chat-composer")).toBeTruthy();
    expect(
      graph.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
