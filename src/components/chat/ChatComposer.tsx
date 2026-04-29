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
}: ChatComposerProps) {
  const canSubmit = !isDisabled && input.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 450)}px`;
  }, [input]);

  useLayoutEffect(() => {
    const pos = pendingSelectionRef.current;
    if (pos == null) return;
    const ta = textareaRef.current;
    if (ta) {
      ta.setSelectionRange(pos, pos);
    }
    pendingSelectionRef.current = null;
  }, [input]);

  useEffect(() => {
    const handleFocusComposer = () => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };
    window.addEventListener(FOCUS_COMPOSER_EVENT, handleFocusComposer);
    return () =>
      window.removeEventListener(FOCUS_COMPOSER_EVENT, handleFocusComposer);
  }, []);

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

  return (
    <div
      className="flex flex-col items-center px-4 pt-4 shrink-0"
      data-tour="session-input"
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
            <form
              className="flex flex-col gap-2"
              onSubmit={onSubmit}
              aria-busy={isLoading}
            >
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex relative min-h-[48px] max-h-[450px] rounded-xl border border-input bg-background overflow-hidden">
                  <div
                    ref={mirrorRef}
                    className="absolute inset-0 z-0 py-3 px-4 pr-14 overflow-y-auto pointer-events-none whitespace-pre-wrap break-words text-[0.95rem] leading-[1.5] text-zinc-950 dark:text-zinc-100"
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
                    rows={1}
                    className="relative z-10 w-full min-h-[48px] max-h-[450px] py-3 px-4 pr-14 bg-transparent text-transparent caret-foreground font-inherit text-[0.95rem] leading-[1.5] placeholder:transparent focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto"
                    style={{ color: "transparent" }}
                    value={input}
                    onChange={handleChange}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isDisabled}
                  />
                  <div
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center"
                  >
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
          </div>
        </div>
      </div>
    </div>
  );
}
