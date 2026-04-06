import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  recordInteraction: vi.fn().mockResolvedValue(undefined),
  startBreakOptimistically: vi.fn().mockResolvedValue(undefined),
  resetAfterBreak: vi.fn().mockResolvedValue(undefined),
  useQuery: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthToken: () => "token",
}));

vi.mock("convex/react", () => ({
  useQuery: mocks.useQuery,
  useMutation: vi.fn(),
}));

vi.mock("./useAppUi", () => ({
  useAppUiSelector: (
    fn: (s: { context: { preference: string } }) => string,
  ) => fn({ context: { preference: "think" } }),
}));

import { useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "./useSessionManager";

describe("useSessionManager", () => {
  const sessionId = "jd7abc123" as Id<"sessions">;

  beforeEach(() => {
    vi.mocked(useMutation)
      .mockReset()
      .mockImplementationOnce(() => mocks.recordInteraction)
      .mockImplementationOnce(() => mocks.startBreakOptimistically)
      .mockImplementationOnce(() => mocks.resetAfterBreak);
    mocks.useQuery.mockReset();
    mocks.recordInteraction.mockClear();
  });

  it("canSend when restrict mode but under limit", () => {
    mocks.useQuery.mockReturnValue({
      mode: "restrict" as const,
      limit: 3,
      used: 1,
      breakEndsAt: null,
    });
    const { result } = renderHook(() => useSessionManager(sessionId));
    expect(result.current.canSend).toBe(true);
  });

  it("cannot send during break countdown", () => {
    const t0 = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(t0);
    mocks.useQuery.mockReturnValue({
      mode: "restrict" as const,
      limit: 3,
      used: 3,
      breakEndsAt: t0 + 60_000,
    });
    const { result } = renderHook(() => useSessionManager(sessionId));
    expect(result.current.breakRemainingMs).toBe(60_000);
    expect(result.current.canSend).toBe(false);
    vi.restoreAllMocks();
  });

  it("calls recordInteraction from onInteractionComplete", async () => {
    mocks.useQuery.mockReturnValue({
      mode: "open" as const,
      limit: null,
      used: null,
      breakEndsAt: null,
    });
    const { result } = renderHook(() => useSessionManager(sessionId));
    await act(async () => {
      await result.current.onInteractionComplete();
    });
    expect(mocks.recordInteraction).toHaveBeenCalled();
  });
});
