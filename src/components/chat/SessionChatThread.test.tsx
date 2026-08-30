import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionChatThread } from "./SessionChatThread";

vi.mock("@/contexts/SessionDataContext", () => ({
  useSessionData: () => ({
    chatMessages: [
      { _id: "u1", role: "user", content: "tell me about murmurations" },
      {
        _id: "a1",
        role: "assistant",
        content:
          "### Why do they disappear?\n\n**Emergence** is the point.\n\n- Fish\n- Insects\n\n| Feature | Now | Next |\n| --- | --- | --- |\n| Device | Phone | AR |\n",
      },
    ],
    loadOlderChatMessages: vi.fn(),
    canLoadOlderChatMessages: false,
    chatMessagesLoading: false,
  }),
}));

describe("SessionChatThread markdown", () => {
  it("renders assistant replies as markdown instead of raw syntax", () => {
    render(<SessionChatThread isLoading={false} />);
    expect(
      screen.getByRole("heading", { name: /why do they disappear/i }),
    ).toBeTruthy();
    expect(screen.getByText("Emergence")).toBeTruthy();
    expect(screen.queryByText("**Emergence**")).toBeNull();
    expect(screen.getByText("Fish")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Feature" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Phone" })).toBeTruthy();
  });
});
