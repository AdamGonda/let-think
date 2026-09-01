import type { EditorView } from "@codemirror/view";

/** Keep the caret at ~1/3 from the top of the viewport (eye level). */
export function caretEyeLevelScrollTop(
  caretOffset: number,
  visibleHeight: number,
  scrollHeight: number,
): number {
  const maxScroll = scrollHeight - visibleHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(caretOffset - visibleHeight / 3, maxScroll));
}

export function scrollViewCaretToEyeLevel(view: EditorView): void {
  const scroller = view.scrollDOM;
  if (view.state.doc.toString().trim() === "") {
    scroller.scrollTop = 0;
    return;
  }
  const coords = view.coordsAtPos(view.state.selection.main.head);
  if (!coords) return;
  const scrollerRect = scroller.getBoundingClientRect();
  const caretOffset = coords.top - scrollerRect.top + scroller.scrollTop;
  scroller.scrollTop = caretEyeLevelScrollTop(
    caretOffset,
    scroller.clientHeight,
    scroller.scrollHeight,
  );
}
