import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

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
}

export function Chat({
  sessionId,
  messageHistory,
  isLoading,
  setIsLoading,
  selectedNodes = [],
  onMessageSent,
}: ChatProps) {
  const [input, setInput] = useState("");
  const sendMessage = useAction(api.chat.send);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userContent = input.trim();
    const wordCount = userContent.split(/\s+/).filter(Boolean).length;
    const branching = Math.min(6, Math.max(1, Math.ceil(wordCount / 10)));
    setInput("");
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
        branching,
        selectedNodeContext: selectedNodes.length > 0 ? selectedNodes : undefined,
      });
      onMessageSent?.();
    } catch (err) {
      console.error("Chat error:", err);
      // Put the input back on error
      setInput(userContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 py-3 px-6 pb-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#16171d] shrink-0">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#16171d] text-zinc-950 dark:text-zinc-100 font-inherit text-[0.95rem] placeholder:text-zinc-500 dark:placeholder:text-zinc-500 placeholder:opacity-70 focus:outline-none focus:border-violet-500 dark:focus:border-violet-400 disabled:opacity-60 disabled:cursor-not-allowed"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sessionId ? "Type a message..." : "Select a chat to start"}
          disabled={isLoading || !sessionId}
        />
        <button
          type="submit"
          className="py-3 px-5 border-none rounded-lg bg-violet-600 dark:bg-violet-500 text-white font-inherit font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:opacity-60 flex items-center justify-center gap-2 min-w-[72px]"
          disabled={isLoading || !sessionId}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Thinking</span>
            </>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}