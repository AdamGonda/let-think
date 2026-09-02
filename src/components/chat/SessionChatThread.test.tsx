import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isNearBottom } from "./isNearBottom";
import { SessionChatThread } from "./SessionChatThread";

const { mockSessionData } = vi.hoisted(() => ({
  mockSessionData: {
    chatMessages: [
      { _id: "u1", role: "user" as const, content: "tell me about murmurations" },
      {
        _id: "a1",
        role: "assistant" as const,
        content:
          "### Why do they disappear?\n\n**Emergence** is the point.\n\n- Fish\n- Insects\n\n| Feature | Now | Next |\n| --- | --- | --- |\n| Device | Phone | AR |\n",
      },
    ],
    pendingChatUser: null as {
      role: "user";
      content: string;
    } | null,
    loadOlderChatMessages: vi.fn(),
    canLoadOlderChatMessages: false,
    chatMessagesLoading: false,
  },
}));

vi.mock("@/contexts/SessionDataContext", () => ({
  useSessionData: () => mockSessionData,
}));

afterEach(cleanup);

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

  it("uses the file-view overlay scrollbar and full-column assistant replies", () => {
    const { container } = render(<SessionChatThread isLoading={false} />);
    expect(container.querySelector(".editor-scroll-thumb")).toBeTruthy();
    expect(container.querySelector(".overlay-scroll")).toBeTruthy();
    const assistant = container.querySelector(".chat-md")?.closest("li");
    expect(assistant?.className).toContain("w-full");
    expect(assistant?.className).not.toContain("36rem");
  });

  it("renders a pending user bubble before the server row exists", () => {
    mockSessionData.pendingChatUser = {
      role: "user",
      content: "send this instantly",
    };
    render(<SessionChatThread isLoading={true} />);
    expect(screen.getByText("send this instantly")).toBeTruthy();
    mockSessionData.pendingChatUser = null;
  });

  it("shows attached image thumbnails on user bubbles", () => {
    mockSessionData.chatMessages = [
      {
        _id: "u1",
        role: "user" as const,
        content: "see this",
        imageUrls: ["https://example.com/a.jpg"],
      },
    ];
    const { container } = render(<SessionChatThread isLoading={false} />);
    const img = container.querySelector('img[src="https://example.com/a.jpg"]');
    expect(img).toBeTruthy();
    mockSessionData.chatMessages = [
      { _id: "u1", role: "user" as const, content: "tell me about murmurations" },
      {
        _id: "a1",
        role: "assistant" as const,
        content:
          "### Why do they disappear?\n\n**Emergence** is the point.\n\n- Fish\n- Insects\n\n| Feature | Now | Next |\n| --- | --- | --- |\n| Device | Phone | AR |\n",
      },
    ];
  });
});

describe("isNearBottom", () => {
  it("pins within the threshold and unpins above it", () => {
    expect(isNearBottom(1000, 840, 80)).toBe(true);
    expect(isNearBottom(1000, 839, 80)).toBe(false);
  });
});
