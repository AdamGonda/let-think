import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "./useSessionManager";

describe("useSessionManager", () => {
  const sessionId = "jd7abc123" as Id<"sessions">;

  it("canSend when session is selected", () => {
    const { result } = renderHook(() => useSessionManager(sessionId));
    expect(result.current.canSend).toBe(true);
  });

  it("cannot send without session", () => {
    const { result } = renderHook(() => useSessionManager(null));
    expect(result.current.canSend).toBe(false);
  });
});
