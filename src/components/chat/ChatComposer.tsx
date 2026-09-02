import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { clsx } from "clsx";
import { layout } from "@/config";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseInputTokens } from "@/lib/chatMentions";
import {
  atMentionOptions,
  atQueryAtCaret,
  backspaceRemoveAtReferenceRange,
  deleteForwardRemoveAtReferenceRange,
  ensureSpaceAfterValidAtReferences,
  insertAtMentionToken,
  type NumberedConcept,
} from "@/lib/conceptReferences";
import {
  getCanvasHasInk,
  subscribeCanvasHasInk,
} from "@/lib/canvasSnapshot";
import { IMAGE_PROMPT_MAX, imageFilesFromClipboard } from "@/lib/imageAttach";
import { MessageImageThumbs } from "./MessageImageThumbs";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

/** Shared so the caret (textarea) and glyphs (mirror) wrap on the same metrics. */
const COMPOSER_TEXT_LAYOUT =
  "min-w-0 w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[1.125rem] leading-[1.5] tracking-[0.01em] font-[inherit]";

/** When false, skip {@link ensureSpaceAfterValidAtReferences} so backspace/delete does not re-add the space. */
function shouldApplyAutoSpaceAfterRefs(
  e: React.ChangeEvent<HTMLTextAreaElement>,
  previousLength: number,
): boolean {
  const native = e.nativeEvent as InputEvent;
  const t = native.inputType;
  if (t) {
    if (t === "historyUndo" || t === "historyRedo") return false;
    if (t.startsWith("delete")) return false;
    return true;
  }
  if (e.target.value.length < previousLength) return false;
  return true;
}

type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  placeholder: string;
  numberedConcepts: NumberedConcept[];
  isDisabled: boolean;
  isLoading: boolean;
  sessionLoadingFrame: boolean;
  sessionPastFrame?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  autoFocus?: boolean;
  listenForFocusEvent?: boolean;
  /** Island is the graph dock; dock is a flush bar for the chat panel. */
  chrome?: "island" | "dock";
  /** Chat lane can attach the whole concept graph; graph lane already has it. */
  allowGraphRef?: boolean;
  pendingImages?: Array<{ id: string; previewUrl: string }>;
  onAddImageFiles?: (files: File[]) => void;
  onRemoveImage?: (id: string) => void;
};

export function ChatComposer({
  input,
  setInput,
  placeholder,
  numberedConcepts,
  isDisabled,
  isLoading,
  sessionLoadingFrame,
  sessionPastFrame = false,
  onSubmit,
  autoFocus = true,
  listenForFocusEvent = true,
  chrome = "island",
  allowGraphRef = false,
  pendingImages = [],
  onAddImageFiles,
  onRemoveImage,
}: ChatComposerProps) {
  const canSubmit =
    !isDisabled && (input.trim().length > 0 || pendingImages.length > 0);
  const compact = chrome === "dock";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const pendingExternalFocusRef = useRef(false);
  const [caret, setCaret] = useState(input.length);
  const [highlight, setHighlight] = useState(0);
  const [dismissedQueryStart, setDismissedQueryStart] = useState<number | null>(
    null,
  );
  const [canvasHasInk, setCanvasHasInk] = useState(getCanvasHasInk);

  useEffect(() => subscribeCanvasHasInk(() => setCanvasHasInk(getCanvasHasInk())), []);

  const mentionArgs = {
    numberedConcepts,
    allowGraphRef,
    allowCanvasRef: canvasHasInk,
  };

  const atQuery = isDisabled ? null : atQueryAtCaret(input, caret);
  if (atQuery == null && dismissedQueryStart != null) {
    setDismissedQueryStart(null);
  }
  const pickerDismissed =
    atQuery != null && dismissedQueryStart === atQuery.start;
  const mentionOptions =
    atQuery && !pickerDismissed
      ? atMentionOptions({
          ...mentionArgs,
          query: atQuery.query,
          value: input,
          queryStart: atQuery.start,
        })
      : [];
  const pickerOpen = mentionOptions.length > 0;
  const highlightIndex = pickerOpen
    ? Math.min(highlight, mentionOptions.length - 1)
    : 0;

  const applyMention = (token: string, queryStart: number, caretNow: number, value: string) => {
    const next = insertAtMentionToken(value, queryStart, caretNow, token);
    pendingSelectionRef.current = next.caret;
    setCaret(next.caret);
    setInput(next.value);
  };

  const tryFocusComposer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const canFocus =
      !textarea.disabled && textarea.getClientRects().length > 0;
    if (!canFocus) return false;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
    pendingExternalFocusRef.current = false;
    return true;
  };

  const focusComposerWithRetry = () => {
    let attempts = 0;
    const maxAttempts = 20;

    const focusWhenReady = () => {
      if (tryFocusComposer()) return;
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(focusWhenReady, 32);
      }
    };

    focusWhenReady();
  };

  useLayoutEffect(() => {
    const pos = pendingSelectionRef.current;
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (pos != null && ta) {
      ta.setSelectionRange(pos, pos);
    }
    pendingSelectionRef.current = null;
    if (ta && mirror) mirror.scrollTop = ta.scrollTop;
  }, [input]);

  useLayoutEffect(() => {
    if (!listenForFocusEvent) return;
    const handleFocusComposer = () => {
      pendingExternalFocusRef.current = true;
      focusComposerWithRetry();
    };
    window.addEventListener(FOCUS_COMPOSER_EVENT, handleFocusComposer);
    return () =>
      window.removeEventListener(FOCUS_COMPOSER_EVENT, handleFocusComposer);
  }, [listenForFocusEvent]);

  useLayoutEffect(() => {
    if (!autoFocus && !pendingExternalFocusRef.current) return;
    if (isDisabled) {
      if (autoFocus) pendingExternalFocusRef.current = true;
      return;
    }
    focusComposerWithRetry();
  }, [autoFocus, isDisabled]);

  const handleScroll = () => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (ta && mirror) mirror.scrollTop = ta.scrollTop;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const caretNow = ta.selectionStart ?? 0;
    const liveQuery = atQueryAtCaret(ta.value, caretNow);
    const liveOptions =
      liveQuery && !pickerDismissed
        ? atMentionOptions({
            ...mentionArgs,
            query: liveQuery.query,
            value: ta.value,
            queryStart: liveQuery.start,
          })
        : [];

    if (liveOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % liveOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + liveOptions.length) % liveOptions.length);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedQueryStart(liveQuery!.start);
        setHighlight(0);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const option = liveOptions[Math.min(highlight, liveOptions.length - 1)];
        if (option) {
          applyMention(option.token, liveQuery!.start, caretNow, ta.value);
        }
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).form?.requestSubmit();
      return;
    }

    if (isDisabled || (e.key !== "Backspace" && e.key !== "Delete")) {
      return;
    }

    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start !== end) return;

    const value = ta.value;

    if (e.key === "Backspace") {
      const range = backspaceRemoveAtReferenceRange(value, start);
      if (range) {
        e.preventDefault();
        const newValue = value.slice(0, range.start) + value.slice(range.end);
        pendingSelectionRef.current = range.start;
        setCaret(range.start);
        setInput(newValue);
      }
      return;
    }

    if (e.key === "Delete") {
      const range = deleteForwardRemoveAtReferenceRange(value, start);
      if (range) {
        e.preventDefault();
        const newValue = value.slice(0, range.start) + value.slice(range.end);
        pendingSelectionRef.current = range.start;
        setCaret(range.start);
        setInput(newValue);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    const v = el.value;
    const sel = el.selectionStart ?? v.length;

    if (!shouldApplyAutoSpaceAfterRefs(e, input.length)) {
      setCaret(sel);
      setInput(v);
      return;
    }

    const next = ensureSpaceAfterValidAtReferences(v, numberedConcepts);
    if (next === v) {
      setCaret(sel);
      setInput(v);
      return;
    }
    const delta = next.length - v.length;
    const nextCaret = Math.min(sel + delta, next.length);
    pendingSelectionRef.current = nextCaret;
    setCaret(nextCaret);
    setInput(next);
  };

  const fieldMinH = compact ? "min-h-10" : "min-h-[48px]";
  const fieldMaxH = compact ? "max-h-48" : "max-h-[450px]";
  const fieldPad = compact
    ? "pt-2 pb-2.5 pl-[2.625rem] pr-[2.75rem] scroll-pb-2.5"
    : "pt-3 pb-2.5 pl-[2.625rem] pr-[2.75rem] scroll-pb-2.5";
  const canAttach =
    !isDisabled &&
    pendingImages.length < IMAGE_PROMPT_MAX &&
    !!onAddImageFiles;

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onAddImageFiles || isDisabled) return;
    const files = imageFilesFromClipboard(e.clipboardData);
    if (files.length === 0) return;
    e.preventDefault();
    onAddImageFiles(files);
  };

  const form = (
    <form
      className="flex flex-col gap-2"
      onSubmit={onSubmit}
      aria-busy={isLoading}
    >
      {pendingImages.length > 0 ? (
        <MessageImageThumbs
          urls={pendingImages.map((img) => img.previewUrl)}
          onRemove={
            onRemoveImage
              ? (index) => {
                  const id = pendingImages[index]?.id;
                  if (id) onRemoveImage(id);
                }
              : undefined
          }
        />
      ) : null}
      <div className="flex gap-2 items-end relative">
        {pickerOpen ? (
          <ul
            role="listbox"
            data-testid="at-mention-picker"
            className="absolute bottom-full left-0 right-10 z-30 mb-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-md"
          >
            {mentionOptions.map((opt, i) => (
              <li key={`${opt.kind}-${opt.token}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                    i === highlightIndex
                      ? "bg-zinc-200 dark:bg-zinc-700"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  )}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    if (!atQuery) return;
                    applyMention(opt.token, atQuery.start, caret, input);
                  }}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground">@{opt.token}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div
          className={clsx(
            "flex-1 flex min-w-0 relative overflow-hidden border border-input bg-background",
            compact ? "rounded-lg" : "rounded-xl",
            fieldMinH,
          )}
        >
          <div
            ref={mirrorRef}
            className={clsx(
              "absolute inset-0 z-0 overflow-y-auto pointer-events-none text-zinc-950 dark:text-zinc-100",
              COMPOSER_TEXT_LAYOUT,
              fieldPad,
            )}
            aria-hidden
          >
            {input ? (
              <>
                {parseInputTokens(input, numberedConcepts).map((seg, i) =>
                  seg.type === "token" && seg.name ? (
                    <span
                      key={i}
                      className="rounded-sm bg-zinc-300/70 dark:bg-zinc-600/70 text-inherit"
                      title={seg.name}
                    >
                      {seg.content}
                    </span>
                  ) : (
                    seg.content
                  ),
                )}
                {"\n"}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            data-session-input-textarea
            autoFocus={autoFocus}
            rows={1}
            className={clsx(
              "relative z-10 field-sizing-content bg-transparent text-transparent caret-foreground placeholder:transparent focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto",
              COMPOSER_TEXT_LAYOUT,
              fieldMinH,
              fieldMaxH,
              fieldPad,
            )}
            style={{ color: "transparent" }}
            value={input}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={isDisabled}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (files.length > 0) onAddImageFiles?.(files);
            }}
          />
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-foreground"
              disabled={!canAttach}
              aria-label="Attach image"
              title="Attach image"
              data-testid="composer-attach-image"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} strokeWidth={2} aria-hidden />
            </Button>
          </div>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-foreground"
              disabled={!canSubmit}
              aria-label={
                isLoading ? "Generating response" : "Generate response"
              }
              title={isLoading ? "Generating response" : "Generate response"}
            >
              {isLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin text-(--session-accent)"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <ArrowUp size={16} strokeWidth={2} aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );

  if (compact) {
    return (
      <div
        className={clsx(
          "shrink-0 border-t bg-background px-3 py-2",
          sessionLoadingFrame
            ? "border-t-2 border-(--session-accent) session-loading-chat-chrome-pulse"
            : "border-border",
        )}
        data-tour="session-input"
        data-composer-chrome="dock"
      >
        {form}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center px-4 pt-4 shrink-0"
      data-tour="session-input"
      data-composer-chrome="island"
    >
      <div className={clsx("relative w-full", layout.sessionInputIslandMaxWidthClass)}>
        <div className="invisible pointer-events-none w-full" aria-hidden>
          <div
            className={clsx(
              "flex flex-col gap-3 rounded-t-2xl px-4 py-3 pb-4",
              sessionPastFrame ? "shadow-none" : "shadow-lg",
              layout.sessionInputChromeMinClass,
              sessionLoadingFrame
                ? "border-t-2 border-l-2 border-r-2 border-b-0 border-(--session-accent) session-loading-chat-chrome-pulse"
                : sessionPastFrame
                  ? "border-t-2 border-l-2 border-r-2 border-b-0 session-past-chat-chrome-static"
                  : "border border-b-0 border-border",
            )}
            style={{ backgroundColor: "#2B2B28" }}
          >
            <div className="min-h-[48px] rounded-xl border border-input bg-background" />
          </div>
        </div>

        <div
          className={clsx(
            "absolute inset-x-0 bottom-0",
            layout.sessionInputExpandedOverlayZClass,
          )}
        >
          <div
            className={clsx(
              "flex flex-col gap-3 rounded-t-2xl px-4 py-3 pb-4 pt-4",
              sessionPastFrame ? "shadow-none" : "shadow-lg",
              layout.sessionInputChromeMinClass,
              sessionLoadingFrame
                ? "border-t-2 border-l-2 border-r-2 border-b-0 border-(--session-accent) session-loading-chat-chrome-pulse"
                : sessionPastFrame
                  ? "border-t-2 border-l-2 border-r-2 border-b-0 session-past-chat-chrome-static"
                  : "border border-b-0 border-border",
            )}
            style={{ backgroundColor: "#2B2B28" }}
          >
            {form}
          </div>
        </div>
      </div>
    </div>
  );
}
