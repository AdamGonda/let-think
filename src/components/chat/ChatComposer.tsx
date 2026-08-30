import { useRef, useEffect, useLayoutEffect } from "react";
import { clsx } from "clsx";
import { layout } from "@/config";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseInputTokens } from "@/lib/chatMentions";
import {
  backspaceRemoveAtReferenceRange,
  deleteForwardRemoveAtReferenceRange,
  ensureSpaceAfterValidAtReferences,
  type NumberedConcept,
} from "@/lib/conceptReferences";

const FOCUS_COMPOSER_EVENT = "let-think:focus-composer";

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
}: ChatComposerProps) {
  const canSubmit = !isDisabled && input.trim().length > 0;
  const compact = chrome === "dock";
  const growMaxPx = compact ? 192 : 450;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const pendingExternalFocusRef = useRef(false);

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, growMaxPx)}px`;
  }, [input, growMaxPx]);

  useLayoutEffect(() => {
    const pos = pendingSelectionRef.current;
    if (pos == null) return;
    const ta = textareaRef.current;
    if (ta) {
      ta.setSelectionRange(pos, pos);
    }
    pendingSelectionRef.current = null;
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).form?.requestSubmit();
      return;
    }

    if (isDisabled || (e.key !== "Backspace" && e.key !== "Delete")) {
      return;
    }

    const ta = e.currentTarget;
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
        setInput(newValue);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    const v = el.value;
    const sel = el.selectionStart ?? v.length;

    if (!shouldApplyAutoSpaceAfterRefs(e, input.length)) {
      setInput(v);
      return;
    }

    const next = ensureSpaceAfterValidAtReferences(v, numberedConcepts);
    if (next === v) {
      setInput(v);
      return;
    }
    const delta = next.length - v.length;
    pendingSelectionRef.current = Math.min(sel + delta, next.length);
    setInput(next);
  };

  const fieldMinH = compact ? "min-h-10" : "min-h-[48px]";
  const fieldMaxH = compact ? "max-h-48" : "max-h-[450px]";
  const fieldPad = compact ? "py-2 px-3 pr-12" : "py-3 px-4 pr-14";

  const form = (
    <form
      className="flex flex-col gap-2"
      onSubmit={onSubmit}
      aria-busy={isLoading}
    >
      <div className="flex gap-2 items-end">
        <div
          className={clsx(
            "flex-1 flex relative overflow-hidden border border-input bg-background",
            compact ? "rounded-lg" : "rounded-xl",
            fieldMinH,
            fieldMaxH,
          )}
        >
          <div
            ref={mirrorRef}
            className={clsx(
              "absolute inset-0 z-0 overflow-y-auto pointer-events-none whitespace-pre-wrap break-words text-[0.95rem] leading-[1.5] text-zinc-950 dark:text-zinc-100",
              fieldPad,
            )}
            aria-hidden
          >
            {input ? (
              parseInputTokens(input, numberedConcepts).map((seg, i) =>
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
              )
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
              "relative z-10 w-full bg-transparent text-transparent caret-foreground font-inherit text-[0.95rem] leading-[1.5] placeholder:transparent focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto",
              fieldMinH,
              fieldMaxH,
              fieldPad,
            )}
            style={{ color: "transparent" }}
            value={input}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center">
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
      <div className={clsx("relative w-full", layout.mainColumnMaxWidthClass)}>
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
