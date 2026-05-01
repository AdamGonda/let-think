import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { SquareIdeaPage } from "./SquareIdeaPage";
import type { AnchorHTMLAttributes, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  useParams: () => ({ publicFileId: "pub_1" }),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("SquareIdeaPage", () => {
  it("renders missing state", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    render(<SquareIdeaPage />);
    expect(screen.getByText("Idea not found")).toBeTruthy();
  });

  it("renders idea details", () => {
    vi.mocked(useQuery).mockReturnValue({
      _id: "pub_1",
      _creationTime: Date.now(),
      sessionId: "s1",
      ownerUserId: "u1",
      publishedAt: Date.now(),
      titleSnapshot: "Deep Work Ritual",
      thinkingNotesSnapshot: "Longer body of the idea.",
      draftInputSnapshot: "",
    });
    render(<SquareIdeaPage />);
    expect(screen.getByText("Deep Work Ritual")).toBeTruthy();
    expect(screen.getByText("Longer body of the idea.")).toBeTruthy();
  });
});
