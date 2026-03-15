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
      });
    } catch (err) {
      console.error("Chat error:", err);
      // Put the input back on error
      setInput(userContent);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="chat-empty">
        <p>Select a chat or create a new one to get started.</p>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messageHistory.map((msg, i) => (
          <div
            key={msg._id ?? i}
            className={`chat-message chat-message--${msg.role}`}
          >
            <span className="chat-message__role">
              {msg.role === "user" ? "You" : "Assistant"}
            </span>
            <div className="chat-message__content">{msg.content}</div>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chat-submit"
          disabled={isLoading}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}