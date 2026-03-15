import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  /** Conversation history for context and display */
  messageHistory: Array<{
    _id?: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
}

export function Chat({ sessionId, messageHistory }: ChatProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [branching, setBranching] = useState(2);
  const sendMessage = useAction(api.chat.send);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userContent = input.trim();
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
      });
    } catch (err) {
      console.error("Chat error:", err);
      // Put the input back on error
      setInput(userContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-bar">
      <label className="chat-branching">
        <span className="chat-branching__label">Branching spectrum</span>
        <input
          type="range"
          min={1}
          max={3}
          value={branching}
          onChange={(e) => setBranching(Number(e.target.value))}
          className="chat-branching__slider"
        />
        <span className="chat-branching__value">{branching}</span>
      </label>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sessionId ? "Type a message..." : "Select a chat to start"}
          disabled={isLoading || !sessionId}
        />
      <button
        type="submit"
        className="chat-submit"
        disabled={isLoading || !sessionId}
      >
        {isLoading ? "..." : "Send"}
      </button>
    </form>
    </div>
  );
}