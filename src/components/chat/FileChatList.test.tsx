import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { FileChatList } from "./FileChatList";

describe("FileChatList", () => {
  it("starts a new chat and switches threads", () => {
    const onNewChat = vi.fn();
    const onSelect = vi.fn();
    const { container, getByLabelText, getByText } = render(
      <FileChatList
        activeChatSessionId={"a" as Id<"chatSessions">}
        onNewChat={onNewChat}
        onSelect={onSelect}
        chats={[
          { _id: "a" as Id<"chatSessions">, title: "Current" },
          { _id: "b" as Id<"chatSessions">, title: "Other" },
        ]}
      />,
    );

    expect(container.querySelector(".overlay-scroll")).toBeTruthy();
    expect(container.querySelector(".editor-scroll-thumb")).toBeTruthy();

    fireEvent.click(getByLabelText("New chat"));
    expect(onNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText("Other"));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("keeps long titles to a single truncated line", () => {
    const long =
      "A very long chat title that should not wrap to a second line in the list";
    const { getByText } = render(
      <FileChatList
        activeChatSessionId={"a" as Id<"chatSessions">}
        onNewChat={vi.fn()}
        onSelect={vi.fn()}
        chats={[{ _id: "a" as Id<"chatSessions">, title: long }]}
      />,
    );

    expect(getByText(long).className).toContain("truncate");
    expect(getByText(long).closest("button")?.className).toContain("h-9");
  });
});
