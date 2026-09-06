import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EDITOR_FOLD_ALL_HEADINGS_EVENT } from "./headingFold";
import {
  getStoredHeadingFolds,
  setStoredHeadingFolds,
} from "@/lib/headingFoldStorage";
import { MarkdownEditor } from "./MarkdownEditor";

const doc = ["# One", "body one", "# Two", "body two"].join("\n");

describe("MarkdownEditor heading fold persistence", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("saves folds and restores them after remount", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );

    window.dispatchEvent(new Event(EDITOR_FOLD_ALL_HEADINGS_EVENT));
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "0:# Two"]);
    const foldedBefore = document.querySelectorAll(".cm-foldMarker-closed").length;
    expect(foldedBefore).toBeGreaterThanOrEqual(2);

    unmount();
    expect(document.querySelectorAll(".cm-foldMarker-closed")).toHaveLength(0);

    render(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    expect(document.querySelectorAll(".cm-foldMarker-closed").length).toBe(
      foldedBefore,
    );
  });

  it("persists a gutter marker click", () => {
    const onChange = vi.fn();
    render(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    const open = document.querySelectorAll(".cm-foldMarker-open");
    expect(open.length).toBeGreaterThan(0);
    fireEvent.click(open[0]!);
    expect(getStoredHeadingFolds("file-1").length).toBeGreaterThan(0);
  });

  it("restores folds when document content arrives after mount", () => {
    setStoredHeadingFolds("file-1", ["0:# One", "0:# Two"]);
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor value="" onChange={onChange} documentId="file-1" />,
    );

    rerender(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    expect(
      document.querySelectorAll(".cm-foldMarker-closed").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("does not wipe stored folds when the parent replaces the document", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    window.dispatchEvent(new Event(EDITOR_FOLD_ALL_HEADINGS_EVENT));
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "0:# Two"]);

    rerender(
      <MarkdownEditor
        value={`${doc}\n`}
        onChange={onChange}
        documentId="file-1"
      />,
    );
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "0:# Two"]);
    expect(
      document.querySelectorAll(".cm-foldMarker-closed").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("restores folds after notes are cleared and reloaded", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    window.dispatchEvent(new Event(EDITOR_FOLD_ALL_HEADINGS_EVENT));
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "0:# Two"]);

    rerender(
      <MarkdownEditor value="" onChange={onChange} documentId="file-1" />,
    );
    rerender(
      <MarkdownEditor value={doc} onChange={onChange} documentId="file-1" />,
    );
    expect(getStoredHeadingFolds("file-1")).toEqual(["0:# One", "0:# Two"]);
    expect(
      document.querySelectorAll(".cm-foldMarker-closed").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps restored folds when autoFocusEnd places the caret", () => {
    setStoredHeadingFolds("file-1", ["0:# One", "0:# Two"]);
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor
        value=""
        onChange={onChange}
        documentId="file-1"
        autoFocus
        autoFocusEnd
        variant="focused"
      />,
    );

    rerender(
      <MarkdownEditor
        value={doc}
        onChange={onChange}
        documentId="file-1"
        autoFocus
        autoFocusEnd
        variant="focused"
      />,
    );
    expect(
      document.querySelectorAll(".cm-foldMarker-closed").length,
    ).toBeGreaterThanOrEqual(2);
  });
});
