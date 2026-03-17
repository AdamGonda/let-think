import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "../hooks/useSessionManager";

interface SelectedNode {
  id: string;
  name: string;
  description?: string;
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
  /** Nodes selected by user to add as context to the next prompt */
  selectedNodes?: SelectedNode[];
  /** Called after a message is sent successfully (e.g. to clear selections) */
  onMessageSent?: () => void;
  /** Controlled draft input (shared with overlay during loading/break) */
  draftInput?: string;
  setDraftInput?: (value: string) => void;
  /** Called when the model finishes responding (overlay stays visible until user exits) */
  onModelResponded?: () => void;
}

export function Chat({
  sessionId,
  messageHistory,
  isLoading,
  setIsLoading,
  selectedNodes = [],
  onMessageSent,
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

    const userContent = input.trim();
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
        { role: "user" as const, content: userContent },
      ];

      await sendMessage({
        messages,
        sessionId,
        userContent,
        selectedNodeContext: selectedNodes.length > 0 ? selectedNodes : undefined,
      });
      onInteractionComplete();
      onMessageSent?.();
      setIsLoading(false);
      onModelResponded?.();
    } catch (err) {
      console.error("Chat error:", err);
      // Put the input back on error
      setInput(userContent);
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !sessionId || !canSend;

  const placeholder =
    breakRemainingFormatted
      ? `Wake up in ${breakRemainingFormatted}`
      : sessionId
        ? "Type..."
        : "Select a chat to start";

  const showInteractionCount =
    sessionId && breakRemainingMs === null && remaining !== null && limit !== null;
  const showFallback =
    sessionId && breakRemainingMs === null && remaining === null && limit === null;

  return (
    <div className="flex flex-col gap-2 py-3 px-6 pb-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#16171d] shrink-0">
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
          className="flex-1 min-h-[48px] max-h-[240px] py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit text-[0.95rem] placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:opacity-70 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
        />
        <button
          type="submit"
          className="py-3 px-5 border-none rounded-lg bg-violet-600 dark:bg-violet-500 text-white font-inherit font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:opacity-60 flex items-center justify-center gap-2 min-w-[72px]"
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