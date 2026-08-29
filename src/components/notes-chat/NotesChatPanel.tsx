import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotesChatMessage } from "@/hooks/useNotesChat";
import type { Id } from "../../../convex/_generated/dataModel";

type NotesChatPanelProps = {
  sessionId: Id<"sessions"> | null;
  messages: NotesChatMessage[];
  messagesLoading?: boolean;
  isLoading: boolean;
  onSend: (content: string) => Promise<void>;
};

export function NotesChatPanel({
  sessionId,
  messages,
  messagesLoading = false,
  isLoading,
  onSend,
}: NotesChatPanelProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;
    const text = input.trim();
    setInput("");
    await onSend(text);
  };

  const canSubmit = Boolean(sessionId) && !isLoading && input.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={messagesLoading || isLoading}
      >
        {messagesLoading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask about your notes — feedback, structure, or what to explore next.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((msg) => (
              <li
                key={msg._id}
                className={clsx(
                  "max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  msg.role === "user"
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "mr-auto bg-background/80 text-foreground border border-border",
                )}
              >
                {msg.content}
              </li>
            ))}
            {isLoading ? (
              <li className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Thinking…
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border px-3 py-3"
        aria-busy={isLoading}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) {
                  void handleSubmit(e as unknown as FormEvent);
                }
              }
            }}
            placeholder="Ask about this note…"
            rows={2}
            disabled={!sessionId || isLoading}
            className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon-sm"
            variant="outline"
            disabled={!canSubmit}
            aria-label={isLoading ? "Sending" : "Send message"}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
