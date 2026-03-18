import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "../hooks/useSessionManager";

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

/** Parse @N references from user input, resolve to concept names, and build mentions. */
function resolveAtReferences(
  userContent: string,
  numberedConcepts: NumberedConcept[]
): {
  resolvedContent: string;
  referencedConcepts: NumberedConcept[];
  mentions: Mention[];
} {
  const conceptByNumber = new Map(numberedConcepts.map((c) => [c.number, c]));
  const refRegex = /@(\d+)\b/g;
  let resolvedContent = "";
  const mentions: Mention[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = refRegex.exec(userContent)) !== null) {
    const num = parseInt(m[1]!, 10);
    const concept = conceptByNumber.get(num);
    if (!concept) {
      resolvedContent += userContent.slice(lastIndex, m.index + m[0].length);
      lastIndex = m.index + m[0].length;
      continue;
    }
    resolvedContent += userContent.slice(lastIndex, m.index);
    const start = resolvedContent.length;
    resolvedContent += concept.name;
    const end = resolvedContent.length;
    mentions.push({ start, end, conceptId: concept.id, name: concept.name });
    lastIndex = m.index + m[0].length;
  }
  resolvedContent += userContent.slice(lastIndex);

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
  const sendMessage = useAction(api.chat.send);
  const {
    canSend,
    remaining,
    limit,
    breakRemainingMs,
    breakRemainingFormatted,
    onInteractionComplete,
    startBreakOptimistically,
  } = useSessionManager(sessionId);

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

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
          ? "Type... (use @1, @2, etc. to reference concepts)"
          : "Type..."
        : "Select a chat to start";

  const showInteractionCount =
    sessionId && breakRemainingMs === null && remaining !== null && limit !== null;
  const showFallback =
    sessionId && breakRemainingMs === null && remaining === null && limit === null;

  return (
    <div className="flex flex-col gap-2 py-3 px-6 pb-4 border-t border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16171d] shrink-0">
      {showInteractionCount && (
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {remaining} interactions until long break
        </p>
      )}
      {showFallback && (
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Interactions limited—send a message to see your count until long break
        </p>
      )}
      <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 min-h-[48px] max-h-[240px] py-3 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit text-[0.95rem] placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:opacity-70 focus:outline-none focus:border-white dark:focus:border-[#16171d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
        />
        <button
          type="submit"
          className="py-3 px-5 h-[44px] mb-[4px] border-none rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-inherit font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:opacity-60 flex items-center justify-center gap-2 min-w-[72px]"
          disabled={isDisabled}
        >
          {isLoading ? (
            <span className="text-lg uppercase">Wake up</span>
          ) : breakRemainingFormatted ? (
            breakRemainingFormatted
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}