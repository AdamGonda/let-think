import { memo, useEffect, useRef } from "react";
import {
  EditorSelection,
  EditorState,
  Compartment,
  Transaction,
} from "@codemirror/state";
import { EditorView, placeholder as cmPlaceholder } from "@codemirror/view";
import { timings } from "@/config";
import { scrollViewCaretToEyeLevel } from "./editorCaretScroll";
import { editorScrollThumbLayout } from "./editorScrollThumbLayout";
import {
  EDITOR_FOLD_ALL_HEADINGS_EVENT,
  EDITOR_UNFOLD_ALL_EVENT,
  foldAllHeadingSections,
  unfoldAllSections,
} from "./headingFold";
import { markdownEditorExtensions } from "./markdownEditorExtensions";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  selectionRange?: { start: number; end: number } | null;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Use dark theme for the editor */
  dark?: boolean;
  /** "focused" = full-height, document-style typography for loading screen */
  variant?: "default" | "focused";
  /** Focus the editor on mount (for overlay so Chat doesn't steal input) */
  autoFocus?: boolean;
  /** Place cursor at end of text when focusing (e.g. when loading so user can continue typing) */
  autoFocusEnd?: boolean;
}

function selectionRangeEqual(
  a: { start: number; end: number } | null | undefined,
  b: { start: number; end: number } | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.start === b.start && a.end === b.end;
}

function MarkdownEditorComponent({
  value,
  onChange,
  selectionRange = null,
  placeholder = "Write in markdown…",
  className = "",
  minHeight = "120px",
  dark = false,
  variant = "default",
  autoFocus = false,
  autoFocusEnd = false,
}: MarkdownEditorProps) {
  const isFocused = variant === "focused";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialDocRef = useRef(value);
  const placeholderCompartmentRef = useRef(new Compartment());
  const endCursorAppliedRef = useRef(false);
  /** Last programmatic range we applied — keyed by start/end only (not value length). */
  const appliedSelectionRangeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const placeholderCompartment = placeholderCompartmentRef.current;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialDocRef.current,
        extensions: [
          ...markdownEditorExtensions(
            placeholderCompartment.of(cmPlaceholder(placeholder)),
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;

    let hideTimer = 0;
    const thumb = scrollThumbRef.current;
    const scroller = view.scrollDOM;
    const hide = () => {
      if (!thumb) return;
      thumb.style.transition = "opacity 0.5s ease";
      thumb.style.opacity = "0";
    };
    const onScroll = () => {
      if (!thumb) return;
      const layout = editorScrollThumbLayout(
        scroller.clientHeight,
        scroller.scrollHeight,
        scroller.scrollTop,
      );
      if (!layout) {
        hide();
        return;
      }
      thumb.style.height = `${layout.height}px`;
      thumb.style.transform = `translateY(${layout.top}px)`;
      thumb.style.transition = "opacity 0.12s ease";
      thumb.style.opacity = "1";
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, timings.editorScrollbarIdleMs);
    };
    if (isFocused && thumb) {
      scroller.addEventListener("scroll", onScroll, { passive: true });
    }
    if (autoFocus) view.focus();

    return () => {
      window.clearTimeout(hideTimer);
      scroller.removeEventListener("scroll", onScroll);
      view.destroy();
      viewRef.current = null;
    };
    // ponytail: EditorView is created once; placeholder updates via compartment.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  useEffect(() => {
    const onFoldAll = () => {
      const view = viewRef.current;
      if (view) foldAllHeadingSections(view);
    };
    const onUnfoldAll = () => {
      const view = viewRef.current;
      if (view) unfoldAllSections(view);
    };
    window.addEventListener(EDITOR_FOLD_ALL_HEADINGS_EVENT, onFoldAll);
    window.addEventListener(EDITOR_UNFOLD_ALL_EVENT, onUnfoldAll);
    return () => {
      window.removeEventListener(EDITOR_FOLD_ALL_HEADINGS_EVENT, onFoldAll);
      window.removeEventListener(EDITOR_UNFOLD_ALL_EVENT, onUnfoldAll);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: placeholderCompartmentRef.current.reconfigure(
        cmPlaceholder(placeholder),
      ),
    });
  }, [placeholder]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      annotations: [Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useEffect(() => {
    if (!autoFocusEnd) return;
    if (selectionRange) return;
    if (value.length === 0) {
      endCursorAppliedRef.current = false;
      return;
    }
    if (endCursorAppliedRef.current) return;
    const view = viewRef.current;
    if (!view || view.state.doc.length === 0) return;
    endCursorAppliedRef.current = true;
    const len = view.state.doc.length;
    view.focus();
    view.dispatch({ selection: EditorSelection.cursor(len) });
    if (isFocused) scrollViewCaretToEyeLevel(view);
  }, [isFocused, autoFocusEnd, value, selectionRange]);

  useEffect(() => {
    if (!selectionRange) {
      appliedSelectionRangeKeyRef.current = null;
      return;
    }
    const rangeKey = `${selectionRange.start}:${selectionRange.end}`;
    if (appliedSelectionRangeKeyRef.current === rangeKey) return;
    const view = viewRef.current;
    if (!view) return;
    const len = view.state.doc.length;
    const start = Math.max(0, Math.min(selectionRange.start, len));
    const end = Math.max(start, Math.min(selectionRange.end, len));
    view.focus();
    view.dispatch({
      selection:
        start === end
          ? EditorSelection.cursor(start)
          : EditorSelection.range(start, end),
    });
    if (isFocused) scrollViewCaretToEyeLevel(view);
    appliedSelectionRangeKeyRef.current = rangeKey;
  }, [selectionRange, isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    const view = viewRef.current;
    if (!view) return;
    if (value.trim() === "") {
      view.scrollDOM.scrollTop = 0;
      return;
    }
    if (view.hasFocus) {
      scrollViewCaretToEyeLevel(view);
    }
  }, [value, isFocused]);

  const handleWrapperClick = () => {
    viewRef.current?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      onClick={handleWrapperClick}
      className={`md-editor-wrapper overflow-hidden cursor-text ${
        isFocused
          ? `md-editor-focused relative flex-1 min-h-0 flex flex-col ${dark ? "md-editor-dark" : ""} ${className}`
          : "rounded-lg border border-zinc-300 dark:border-zinc-700 focus-within:border-white dark:focus-within:border-zinc-800 transition-colors"
      } ${className}`}
    >
      <div
        ref={parentRef}
        className={isFocused ? "flex-1 min-h-0 flex flex-col" : undefined}
        style={isFocused ? undefined : { minHeight, height: minHeight }}
      />
      {isFocused ? (
        <div
          ref={scrollThumbRef}
          className="editor-scroll-thumb"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export const MarkdownEditor = memo(
  MarkdownEditorComponent,
  (prev, next) =>
    prev.value === next.value &&
    prev.onChange === next.onChange &&
    selectionRangeEqual(prev.selectionRange, next.selectionRange) &&
    prev.placeholder === next.placeholder &&
    prev.className === next.className &&
    prev.minHeight === next.minHeight &&
    prev.dark === next.dark &&
    prev.variant === next.variant &&
    prev.autoFocus === next.autoFocus &&
    prev.autoFocusEnd === next.autoFocusEnd,
);
