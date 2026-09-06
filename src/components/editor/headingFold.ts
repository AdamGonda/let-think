import {
  ensureSyntaxTree,
  foldable,
  foldedRanges,
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

function headingFoldKey(lineText: string, occurrence: number): string {
  return `${occurrence}:${lineText}`;
}

function eachFoldableHeading(
  state: EditorState,
  fn: (
    range: { from: number; to: number },
    lineText: string,
    occurrence: number,
  ) => void,
): void {
  ensureSyntaxTree(state, state.doc.length, 5000);
  const seen = new Map<string, number>();
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (!ATX_HEADING.test(line.text)) continue;
    const range = foldable(state, line.from, line.to);
    if (!range) continue;
    const occurrence = seen.get(line.text) ?? 0;
    seen.set(line.text, occurrence + 1);
    fn(range, line.text, occurrence);
  }
}

export function headingFoldRanges(
  state: EditorState,
): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  eachFoldableHeading(state, (range) => {
    ranges.push(range);
  });
  return ranges;
}

export function foldedHeadingKeys(state: EditorState): string[] {
  const folded = foldedRanges(state);
  const keys: string[] = [];
  eachFoldableHeading(state, (range, lineText, occurrence) => {
    let isFolded = false;
    folded.between(range.from, range.to, (from, to) => {
      if (from === range.from && to === range.to) isFolded = true;
    });
    if (isFolded) keys.push(headingFoldKey(lineText, occurrence));
  });
  return keys;
}

export function foldHeadingsByKeys(
  view: EditorView,
  keys: readonly string[],
): boolean {
  if (keys.length === 0) return false;
  const keySet = new Set(keys);
  const ranges: Array<{ from: number; to: number }> = [];
  eachFoldableHeading(view.state, (range, lineText, occurrence) => {
    if (keySet.has(headingFoldKey(lineText, occurrence))) ranges.push(range);
  });
  if (ranges.length === 0) return false;
  view.dispatch({ effects: ranges.map((range) => foldEffect.of(range)) });
  return true;
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
