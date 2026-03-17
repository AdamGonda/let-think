import { useRef, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
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

export function MarkdownEditor({
  value,
  onChange,
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
          ? `md-editor-focused flex-1 min-h-0 flex flex-col rounded-xl border-2 ${dark ? "md-editor-dark border-zinc-500" : "border-zinc-300"} ${className}`
          : "rounded-lg border border-zinc-200 dark:border-zinc-700"
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
        autoFocusEnd={autoFocusEnd}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}
