import { useState, useRef, useEffect } from "react";
import { CornerDownLeft } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionData } from "../contexts/SessionDataContext";
import { formatBreakCountdown } from "../hooks/useSessionManager";

interface NumberedConcept {
  id: string;
  name: string;
  description?: string;
  number: number;
}

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  /** Conversation history for context and display */
  messageHistory: Array<{
    _id?: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  /** Numbered concepts from the current batch - reference with @1, @2, etc. */
  numberedConcepts?: NumberedConcept[];
  /** Controlled draft input (shared with overlay during loading/break) */
  draftInput?: string;
  setDraftInput?: (value: string) => void;
  /** Called when the model finishes responding (overlay stays visible until user exits) */
  onModelResponded?: () => void;
}

export type Mention = { start: number; end: number; conceptId: string; name: string };

/** Parse raw input into segments - @N that match a concept become styled tokens. */
function parseInputTokens(
  raw: string,
  numberedConcepts: NumberedConcept[]
): Array<{ type: "text" | "token"; content: string; name?: string }> {
  const conceptByNumber = new Map(numberedConcepts.map((c) => [c.number, c]));
  const refRegex = /@(\d+)\b/g;
  const segments: Array<{ type: "text" | "token"; content: string; name?: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(raw)) !== null) {
    const num = parseInt(m[1]!, 10);
    const concept = conceptByNumber.get(num);
    if (lastIndex < m.index) {
      segments.push({ type: "text", content: raw.slice(lastIndex, m.index) });
    }
    segments.push({
      type: "token",
      content: m[0]!,
      name: concept?.name,
    });
    lastIndex = m.index + m[0]!.length;
  }
  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: "text", content: "" }];
}

/** Parse @N from raw input, resolve to concept names for LLM/store, build mentions. */
function resolveAtReferences(
  rawContent: string,
  numberedConcepts: NumberedConcept[]
): { resolvedContent: string; referencedConcepts: NumberedConcept[]; mentions: Mention[] } {
  const conceptByNumber = new Map(numberedConcepts.map((c) => [c.number, c]));
  const refRegex = /@(\d+)\b/g;
  let resolvedContent = "";
  const mentions: Mention[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = refRegex.exec(rawContent)) !== null) {
    const num = parseInt(m[1]!, 10);
    const concept = conceptByNumber.get(num);
    if (!concept) {
      resolvedContent += rawContent.slice(lastIndex, m.index + m[0]!.length);
      lastIndex = m.index + m[0]!.length;
      continue;
    }
    resolvedContent += rawContent.slice(lastIndex, m.index);
    const start = resolvedContent.length;
    resolvedContent += concept.name;
    mentions.push({ start, end: resolvedContent.length, conceptId: concept.id, name: concept.name });
    lastIndex = m.index + m[0]!.length;
  }
  resolvedContent += rawContent.slice(lastIndex);

  const referencedIds = new Set(mentions.map((x) => x.conceptId));
  const referencedConcepts = numberedConcepts.filter((c) => referencedIds.has(c.id));
  return { resolvedContent, referencedConcepts, mentions };
}

export function Chat({
  sessionId,
  messageHistory,
  isLoading,
  setIsLoading,
  numberedConcepts = [],
  draftInput,
  setDraftInput,
  onModelResponded,
}: ChatProps) {
  const [internalInput, setInternalInput] = useState("");
  const input = draftInput !== undefined ? draftInput : internalInput;
  const setInput =
    setDraftInput !== undefined ? setDraftInput : setInternalInput;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const sendMessage = useAction(api.chat.send);
  const {
    canSend,
    remaining,
    breakRemainingMs,
    onInteractionComplete,
    startBreakOptimistically,
  } = useSessionData();
  const breakRemainingFormatted =
    breakRemainingMs != null && breakRemainingMs > 0
      ? formatBreakCountdown(breakRemainingMs)
      : null;

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  const handleScroll = () => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (ta && mirror) mirror.scrollTop = ta.scrollTop;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || !canSend) return;

    const rawContent = input.trim();
    const { resolvedContent, referencedConcepts, mentions } = resolveAtReferences(
      rawContent,
      numberedConcepts
    );
    setInput("");
    if (remaining === 1 || remaining === null) {
      startBreakOptimistically();
    }
    setIsLoading(true);

    try {
      const messages = [
        ...messageHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: resolvedContent },
      ];

      await sendMessage({
        messages,
        sessionId,
        userContent: resolvedContent,
        selectedNodeContext:
          referencedConcepts.length > 0
            ? referencedConcepts.map(({ id, name, description }) => ({
                id,
                name,
                description,
              }))
            : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      onInteractionComplete();
      setIsLoading(false);
      onModelResponded?.();
    } catch (err) {
      console.error("Chat error:", err);
      // Put the input back on error
      setInput(rawContent);
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !sessionId || !canSend;

  const placeholder =
    breakRemainingFormatted
      ? `Wake up in ${breakRemainingFormatted}`
      : sessionId
        ? numberedConcepts.length > 0
          ? "Type, @ ref concepts"
          : "Type..."
        : "Select a session to start";

  const showInteractionLine = sessionId && breakRemainingMs === null;

  return (
    <div className="flex flex-col items-center px-4 pt-4 shrink-0" data-tour="session-input">
      <div className="w-full max-w-[720px] flex flex-col gap-3 rounded-t-2xl border border-b-0 border-border shadow-lg px-4 py-3 pb-4" style={{ backgroundColor: "#2B2B28" }}>
        {showInteractionLine && (
          <p className="text-sm font-medium text-muted-foreground">
            {remaining ?? "$"} interactions until long break
          </p>
        )}
        <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
          <div className="flex-1 flex relative min-h-[48px] max-h-[240px] rounded-xl border border-input bg-background overflow-hidden">
          <div
            ref={mirrorRef}
            className="absolute inset-0 z-0 py-3 px-4 pr-10 overflow-y-auto pointer-events-none whitespace-pre-wrap break-words text-[0.95rem] leading-[1.5] text-zinc-950 dark:text-zinc-100"
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
                )
              )
            ) : (
              <span className="text-muted-foreground">
                {placeholder}
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            rows={1}
            className="relative z-10 w-full min-h-[48px] max-h-[240px] py-3 px-4 pr-10 bg-transparent text-transparent caret-foreground font-inherit text-[0.95rem] leading-[1.5] placeholder:transparent focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto"
            style={{ color: "transparent" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center"
            title="Press Enter to send"
            aria-hidden
          >
            <CornerDownLeft
              size={18}
              className="text-muted-foreground"
              strokeWidth={2}
            />
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}