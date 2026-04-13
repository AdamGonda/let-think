import { describe, expect, it } from "vitest";
import { userInputForBatch } from "./batchUserInput";
import type { SessionMessage } from "@/contexts/SessionDataContext";

describe("userInputForBatch", () => {
  it("returns batch description when present", () => {
    const batches = [{ description: "  hello world  ", nodeIds: ["a"] }];
    const messages: SessionMessage[] = [];
    expect(userInputForBatch(batches, messages, 0)).toBe("hello world");
  });

  it("falls back to user message by index when description is missing", () => {
    const batches = [{ nodeIds: ["a"] }];
    const messages: SessionMessage[] = [
      { role: "user", content: "first turn" },
      { role: "assistant", content: "ok" },
    ];
    expect(userInputForBatch(batches, messages, 0)).toBe("first turn");
  });
});
