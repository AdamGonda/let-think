import { memo, useRef, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

/** Pixel offset of caret from top of content (for scroll-into-view) */
function getCaretOffset(textarea: HTMLTextAreaElement): number {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  Object.assign(mirror.style, {
    position: "absolute",
    left: "-9999px",
    top: "0",
    width: `${textarea.offsetWidth}px`,
    padding: style.padding,
    font: style.font,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontFamily: style.fontFamily,
    whiteSpace: style.whiteSpace,
    wordWrap: style.wordWrap,
    overflowWrap: style.overflowWrap,
    wordBreak: style.wordBreak,
    boxSizing: style.boxSizing,
  });
  const text = textarea.value.substring(0, textarea.selectionStart);
  const span = document.createElement("span");
  span.innerHTML = "&#8203;"; /* zero-width space */
  mirror.textContent = text;
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const offset = span.offsetTop;
  document.body.removeChild(mirror);
  return offset;
}

function scrollCaretToEyeLevel(
  textarea: HTMLTextAreaElement,
  scrollArea: HTMLElement
) {
  const caretOffset = getCaretOffset(textarea);
  const visibleHeight = scrollArea.clientHeight;
  const scrollHeight = scrollArea.scrollHeight;
  /* Keep caret at ~1/3 from top (eye level) */
  const targetScrollTop = caretOffset - visibleHeight / 3;
  const clamped = Math.max(
    0,
    Math.min(targetScrollTop, scrollHeight - visibleHeight)
  );
  scrollArea.scrollTop = clamped;
}

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
  const endCursorAppliedRef = useRef(false);
  /** Last programmatic range we applied — keyed by start/end only (not value length). */
  const appliedSelectionRangeKeyRef = useRef<string | null>(null);

  /* Replace @uiw autoFocusEnd (broken with large bottom padding) for non-empty notes */
  useEffect(() => {
    if (!isFocused || !autoFocusEnd) return;
    if (selectionRange) return;
    if (value.length === 0) {
      endCursorAppliedRef.current = false;
      return;
    }
    if (endCursorAppliedRef.current) return;

    const tryApply = () => {
      const input = wrapperRef.current?.querySelector(
        ".w-md-editor-text-input",
      ) as HTMLTextAreaElement | null;
      const scrollArea = wrapperRef.current?.querySelector(
        ".w-md-editor-area",
      ) as HTMLElement | null;
      if (!input || !scrollArea || input.value.length === 0) return false;
      endCursorAppliedRef.current = true;
      const len = input.value.length;
      input.focus();
      input.setSelectionRange(len, len);
      scrollCaretToEyeLevel(input, scrollArea);
      return true;
    };

    const id = requestAnimationFrame(() => {
      if (tryApply()) return;
      requestAnimationFrame(() => {
        tryApply();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isFocused, autoFocusEnd, value, selectionRange]);

  useEffect(() => {
    if (!selectionRange) {
      appliedSelectionRangeKeyRef.current = null;
      return;
    }
    const rangeKey = `${selectionRange.start}:${selectionRange.end}`;
    if (appliedSelectionRangeKeyRef.current === rangeKey) return;

    const applySelection = () => {
      const textarea = wrapperRef.current?.querySelector(
        ".w-md-editor-text-input",
      ) as HTMLTextAreaElement | null;
      const scrollArea = wrapperRef.current?.querySelector(
        ".w-md-editor-area",
      ) as HTMLElement | null;
      if (!textarea) return false;
      const start = Math.max(0, Math.min(selectionRange.start, textarea.value.length));
      const end = Math.max(start, Math.min(selectionRange.end, textarea.value.length));
      textarea.focus();
      textarea.setSelectionRange(start, end);
      if (scrollArea) {
        scrollCaretToEyeLevel(textarea, scrollArea);
      }
      appliedSelectionRangeKeyRef.current = rangeKey;
      return true;
    };
    const first = requestAnimationFrame(() => {
      if (applySelection()) return;
      requestAnimationFrame(() => {
        applySelection();
      });
    });
    return () => cancelAnimationFrame(first);
  }, [selectionRange]);

  useEffect(() => {
    if (!autoFocus) return;
    const focusInput = () => {
      const input = wrapperRef.current?.querySelector(
        "textarea, .w-md-editor-text-input"
      ) as HTMLTextAreaElement | null;
      input?.focus();
    };
    focusInput();
    // MDEditor may render its textarea asynchronously
    const id = requestAnimationFrame(() => focusInput());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  /* Auto-scroll to keep cursor at eye level when content changes (e.g. Enter, typing) */
  useEffect(() => {
    if (!isFocused) return;
    const id = requestAnimationFrame(() => {
      const textarea = wrapperRef.current?.querySelector(
        ".w-md-editor-text-input"
      ) as HTMLTextAreaElement | null;
      const scrollArea = wrapperRef.current?.querySelector(
        ".w-md-editor-area"
      ) as HTMLElement | null;
      if (!textarea || !scrollArea) return;
      /* Empty / whitespace-only: stay pinned to top. @uiw/react-md-editor's autoFocusEnd
         sets scrollTop = scrollHeight, which with our large "scroll past end" padding
         jumps the viewport into blank space — avoid that and reset here too. */
      if (value.trim() === "") {
        scrollArea.scrollTop = 0;
        return;
      }
      if (document.activeElement === textarea) {
        scrollCaretToEyeLevel(textarea, scrollArea);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [value, isFocused]);

  const handleWrapperClick = () => {
    const input = wrapperRef.current?.querySelector(
      "textarea, .w-md-editor-text-input"
    ) as HTMLTextAreaElement | null;
    input?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      onClick={handleWrapperClick}
      className={`md-editor-wrapper overflow-hidden cursor-text ${
        isFocused
          ? `md-editor-focused flex-1 min-h-0 flex flex-col ${dark ? "md-editor-dark" : ""} ${className}`
          : "rounded-lg border border-zinc-300 dark:border-zinc-700 focus-within:border-white dark:focus-within:border-zinc-800 transition-colors"
      } ${className}`}
    >
      <MDEditor
        value={value}
        onChange={onChange}
        preview="edit"
        hideToolbar={true}
        visibleDragbar={false}
        height={isFocused ? "100%" : minHeight}
        data-color-mode={dark ? "dark" : "light"}
        /* Library sets textareaWarp.scrollTop = scrollHeight — breaks with our huge
           bottom padding (scroll past end). We handle caret + scroll in effects above. */
        autoFocusEnd={false}
        textareaProps={{
          placeholder,
        }}
      />
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
