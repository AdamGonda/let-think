import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const CHAT_API = CONVEX_URL
  ? `${CONVEX_URL.replace(".cloud", ".site")}/api/chat`
  : "/api/chat";

function getMessageText(message: {
  parts?: Array<{ type?: string; text?: string }>;
}): string {
  return (
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("") ?? ""
  );
}

type DbMessage = { role: "user" | "assistant"; content: string };

function dbMessagesToUIMessages(
  messages: DbMessage[],
  generateId: () => string
): Array<{ id: string; role: "user" | "assistant"; parts: Array<{ type: "text"; text: string }> }> {
  return messages.map((m) => ({
    id: generateId(),
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  initialMessages: DbMessage[];
}

export function Chat({ sessionId, initialMessages }: ChatProps) {
  const [input, setInput] = useState("");
  const addMessages = useMutation(api.sessions.addMessages);

  const initialUIMessages = useMemo(
    () =>
      dbMessagesToUIMessages(
        initialMessages,
        () => `msg-${Math.random().toString(36).slice(2)}`
      ),
    [sessionId]
  );

  const { messages, sendMessage, status } = useChat({
    id: sessionId ?? undefined,
    messages: initialUIMessages,
    transport: new DefaultChatTransport({ api: CHAT_API }),
    onFinish: async ({ message }) => {
      if (!sessionId) return;
      const assistantText = getMessageText(message);
      // User message is second-to-last (last is the assistant we just completed)
      const userMessage = messages[messages.length - 2];
      const userText = userMessage ? getMessageText(userMessage) : "";
      if (userText && assistantText) {
        await addMessages({
          sessionId,
          userContent: userText,
          assistantContent: assistantText,
        });
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;
    sendMessage({ text: input });
    setInput("");
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
        {messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message--${m.role}`}>
            <span className="chat-message__role">{m.role}</span>
            <div className="chat-message__content">{getMessageText(m)}</div>
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
