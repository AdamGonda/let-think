import {
  ensureSyntaxTree,
  foldable,
  foldEffect,
  unfoldAll,
} from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

export const EDITOR_FOLD_ALL_HEADINGS_EVENT =
  "let-think:editor-fold-all-headings";
export const EDITOR_UNFOLD_ALL_EVENT = "let-think:editor-unfold-all";

/** ATX headings (`#`–`######`), including CommonMark's optional 3-space indent. */
const ATX_HEADING = /^\s{0,3}#{1,6}\s/;

export function headingFoldRanges(
  state: EditorState,
): Array<{ from: number; to: number }> {
  ensureSyntaxTree(state, state.doc.length, 5000);
  const ranges: Array<{ from: number; to: number }> = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (!ATX_HEADING.test(line.text)) continue;
    const range = foldable(state, line.from, line.to);
    if (range) ranges.push(range);
  }
  return ranges;
}

export function foldAllHeadingSections(view: EditorView): boolean {
  const ranges = headingFoldRanges(view.state);
  if (ranges.length === 0) return false;
  view.dispatch({ effects: ranges.map((range) => foldEffect.of(range)) });
  return true;
}

export function unfoldAllSections(view: EditorView): boolean {
  return unfoldAll(view);
}
