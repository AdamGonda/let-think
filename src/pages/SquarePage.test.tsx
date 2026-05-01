import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SquarePage } from "./SquarePage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("SquarePage", () => {
  it("renders empty state when there are no published notes", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<SquarePage />);
    expect(screen.getByText("No published notes yet.")).toBeTruthy();
  });

  it("renders published notes entries", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "pub_1",
        sessionId: "s1",
        ownerUserId: "u1",
        publishedAt: Date.now(),
        titleSnapshot: "Session A",
        thinkingNotesSnapshot: "Public notes body",
        draftInputSnapshot: "",
      },
    ]);
    render(<SquarePage />);
    expect(screen.getByText("Session A")).toBeTruthy();
    expect(screen.getByText("Public notes body")).toBeTruthy();
    expect(screen.getByText("Read idea →")).toBeTruthy();
  });
});
