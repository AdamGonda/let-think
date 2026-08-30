import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { FileChatList } from "./FileChatList";

describe("FileChatList", () => {
  it("starts a new chat and switches threads", () => {
    const onNewChat = vi.fn();
    const onSelect = vi.fn();
    const { getByLabelText, getByText } = render(
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

    fireEvent.click(getByLabelText("New chat"));
    expect(onNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText("Other"));
    expect(onSelect).toHaveBeenCalledWith("b");
  });
});
