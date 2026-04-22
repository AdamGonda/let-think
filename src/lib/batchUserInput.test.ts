import { describe, expect, it } from "vitest";
import {
  userInputForBatch,
  userMessageForBatch,
  userMessageChronoIndexForBatch,
} from "./batchUserInput";
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

describe("userMessageForBatch", () => {
  it("matches stored user message by batch description", () => {
    const batches = [
      { description: "hello", nodeIds: ["a"] },
      { description: "second", nodeIds: ["b"] },
    ];
    const messages: SessionMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "…" },
      { role: "user", content: "second" },
    ];
    expect(userMessageForBatch(batches, messages, 1)?.content).toBe("second");
  });
});

describe("userMessageChronoIndexForBatch", () => {
  it("returns the chrono index of the resolved user message", () => {
    const batches = [
      { description: "hello", nodeIds: ["a"] },
      { description: "second", nodeIds: ["b"] },
    ];
    const messages: SessionMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "…" },
      { role: "user", content: "second" },
    ];
    expect(userMessageChronoIndexForBatch(batches, messages, 1)).toBe(1);
  });

  it("maps duplicate descriptions to distinct chronological messages", () => {
    const batches = [
      { description: "same prompt", nodeIds: ["a"] },
      { description: "same prompt", nodeIds: ["b"] },
      { description: "same prompt", nodeIds: ["c"] },
    ];
    const messages: SessionMessage[] = [
      { role: "user", content: "same prompt" },
      { role: "assistant", content: "r1" },
      { role: "user", content: "same prompt" },
      { role: "assistant", content: "r2" },
      { role: "user", content: "same prompt" },
      { role: "assistant", content: "r3" },
    ];

    expect(userMessageChronoIndexForBatch(batches, messages, 0)).toBe(0);
    expect(userMessageChronoIndexForBatch(batches, messages, 1)).toBe(1);
    expect(userMessageChronoIndexForBatch(batches, messages, 2)).toBe(2);
    expect(userMessageForBatch(batches, messages, 1)).toBe(messages[2]);
    expect(userInputForBatch(batches, messages, 2)).toBe("same prompt");
  });
});
