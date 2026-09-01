import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, foldable } from "@codemirror/language";
import { describe, expect, it } from "vitest";
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
});
