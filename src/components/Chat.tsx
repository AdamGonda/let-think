import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const CHAT_API = CONVEX_URL
  ? `${CONVEX_URL.replace(".cloud", ".site")}/api/chat`
  : "/api/chat";

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  /** Conversation history for context (not displayed, only sent to LLM) */
  messageHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export function Chat({ sessionId, messageHistory }: ChatProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addMessages = useMutation(api.sessions.addMessages);

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

      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          sessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const { content: assistantContent } = (await res.json()) as {
        content: string;
      };

      await addMessages({
        sessionId,
        userContent,
        assistantContent,
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