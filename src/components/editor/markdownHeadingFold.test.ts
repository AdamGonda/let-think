import { EditorState } from "@codemirror/state";
import {
  codeFolding,
  ensureSyntaxTree,
  foldable,
  foldedRanges,
} from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  foldAllHeadingSections,
  headingFoldRanges,
  unfoldAllSections,
} from "./headingFold";
import { markdownEditorLanguage } from "./markdownEditorExtensions";

function stateFor(doc: string): EditorState {
  const state = EditorState.create({
    doc,
    extensions: [markdownEditorLanguage],
  });
  ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
}

function foldOnLine(state: EditorState, lineNumber: number) {
  const line = state.doc.line(lineNumber);
  return foldable(state, line.from, line.to);
}

describe("markdown heading fold", () => {
  it("folds a # section through the next same-level heading", () => {
    const doc = ["# One", "body one", "", "# Two", "body two"].join("\n");
    const state = stateFor(doc);
    const range = foldOnLine(state, 1);
    expect(range).not.toBeNull();
    expect(range?.from).toBe(state.doc.line(1).to);
    expect(state.doc.sliceString(range!.from, range!.to)).toBe("\nbody one");
    expect(foldOnLine(state, 4)).not.toBeNull();
  });

  it("folds a nested ## inside a # until the next ## or #", () => {
    const doc = [
      "# Top",
      "intro",
      "## Nested",
      "inner",
      "## Other",
      "other",
      "# Next",
    ].join("\n");
    const state = stateFor(doc);
    const h1 = foldOnLine(state, 1);
    const h2 = foldOnLine(state, 3);
    expect(h1).not.toBeNull();
    expect(h2).not.toBeNull();
    expect(state.doc.sliceString(h1!.from, h1!.to)).toContain("## Nested");
    expect(state.doc.sliceString(h1!.from, h1!.to)).toContain("## Other");
    expect(state.doc.sliceString(h2!.from, h2!.to)).toBe("\ninner");
  });

  it("does not fold a heading with no body", () => {
    const state = stateFor("# Empty\n# Next\nbody");
    expect(foldOnLine(state, 1)).toBeNull();
  });

  it("does not fold ordinary paragraph lines under a heading", () => {
    const doc = [
      "# Foundations",
      "Architecture sits on Convex.",
      "Infrastructure is boring on purpose.",
    ].join("\n");
    const state = stateFor(doc);
    expect(foldOnLine(state, 2)).toBeNull();
    expect(foldOnLine(state, 3)).toBeNull();
    expect(foldOnLine(state, 1)).not.toBeNull();
  });
});

describe("fold all headings", () => {
  it("collects a fold for every heading with a body, including nested ##", () => {
    const doc = [
      "# Top",
      "intro",
      "## Nested",
      "inner",
      "## Other",
      "other",
      "# Next",
      "tail",
    ].join("\n");
    const ranges = headingFoldRanges(stateFor(doc));
    expect(ranges).toHaveLength(4);
  });

  it("does not treat a # line inside a code fence as a heading fold", () => {
    const doc = [
      "# Real",
      "body",
      "```",
      "# not a heading",
      "code",
      "```",
      "# Next",
      "tail",
    ].join("\n");
    const ranges = headingFoldRanges(stateFor(doc));
    expect(ranges).toHaveLength(2);
  });

  it("dispatches folds so nested headings stay folded after unfold of a parent", () => {
    const doc = [
      "# Top",
      "intro",
      "## Nested",
      "inner",
      "# Next",
      "tail",
    ].join("\n");
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [markdownEditorLanguage, codeFolding()],
      }),
    });
    ensureSyntaxTree(view.state, view.state.doc.length, 5000);
    expect(foldAllHeadingSections(view)).toBe(true);
    const folded: Array<[number, number]> = [];
    foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
      folded.push([from, to]);
    });
    expect(folded).toHaveLength(3);
    expect(unfoldAllSections(view)).toBe(true);
    let remaining = 0;
    foldedRanges(view.state).between(0, view.state.doc.length, () => {
      remaining += 1;
    });
    expect(remaining).toBe(0);
    view.destroy();
  });
});
