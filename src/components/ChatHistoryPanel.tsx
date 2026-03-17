import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

const COLLAPSE_THRESHOLD = 180;

function truncateAtWord(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  const cut = content.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const end = lastSpace > maxLen * 0.5 ? lastSpace : maxLen;
  return cut.slice(0, end).trim();
}

interface UserMessage {
  _id?: Id<"messages">;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  topic?: string;
}

type Batch = {
  id: string;
  nodeIds: string[];
  promptSummary?: string;
  description?: string;
};

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** All messages – we filter to user only and display in order */
  messages: UserMessage[];
  /** Graph batches – used to match messages to steps for navigation */
  batches?: Batch[];
  /** Navigate to the given batch/step in the graph view and close panel */
  onNavigateToStep?: (batchIndex: number) => void;
}

function normalizeForMatch(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function ChatHistoryPanel({
  isOpen,
  onClose,
  messages,
  batches = [],
  onNavigateToStep,
}: ChatHistoryPanelProps) {
  const userMessages = messages.filter((m) => m.role === "user");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/30 dark:bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-sm flex flex-col bg-white dark:bg-[#1a1b22] border-l border-zinc-200 dark:border-zinc-700 shadow-xl"
        aria-label="Conversation history"
      >
        <div className="flex items-center justify-between shrink-0 py-4 px-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Conversation history
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close history"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4">
          {userMessages.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-8">
              No messages yet. Start a conversation to see your history here.
            </p>
          ) : (
            <div className="relative">
              <ul className="flex flex-col gap-0 list-none p-0 m-0">
                {userMessages.map((msg, index) => {
                  const key = (msg._id as string) ?? `msg-${index}`;
                  const isLong = msg.content.length > COLLAPSE_THRESHOLD;
                  const isExpanded = expandedIds.has(key);
                  const showFull = !isLong || isExpanded;
                  const displayContent = showFull
                    ? msg.content
                    : truncateAtWord(msg.content, COLLAPSE_THRESHOLD) + "…";

                  // Match message to batch by description (user content)
                  const msgNorm = normalizeForMatch(msg.content);
                  const batchIndex =
                    msgNorm !== ""
                      ? batches.findIndex(
                          (b) => b.description && normalizeForMatch(b.description) === msgNorm
                        )
                      : -1;
                  const hasStep = batchIndex >= 0;

                  return (
                    <li
                      key={key}
                      className="relative flex pb-6 last:pb-0"
                    >
                      {/* Timeline dot - clickable when message has a matching step */}
                      {hasStep && onNavigateToStep ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToStep(batchIndex)}
                          className="absolute left-[7px] top-3 w-3 h-3 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 ring-4 ring-white dark:ring-[#1a1b22] z-10 cursor-pointer hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1a1b22]"
                          title="Go to this step in the graph"
                          aria-label={`Go to step ${batchIndex + 1} in graph`}
                        />
                      ) : (
                        <div
                          className="absolute left-[7px] top-3 w-3 h-3 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 ring-4 ring-white dark:ring-[#1a1b22] z-10"
                          aria-hidden
                        />
                      )}
                      {/* Message bubble */}
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[0.95rem] leading-relaxed shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                          {(() => {
                            const topic = msg.topic?.trim()
                              ? msg.topic
                              : truncateAtWord(msg.content, 60) + (msg.content.length > 60 ? "…" : "");
                            return topic ? (
                              <div
                                className="rounded-t-md -mx-4 -mt-3 mb-3 px-4 py-2 bg-zinc-200/70 dark:bg-zinc-700/70 border-b border-zinc-300/80 dark:border-zinc-600/80"
                                title={msg.topic ?? msg.content}
                              >
                                <p className="text-[0.7rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider line-clamp-2">
                                  {topic}
                                </p>
                              </div>
                            ) : null;
                          })()}
                          {isLong ? (
                            <div className="flex flex-wrap items-center justify-end gap-2 -mt-1 mb-2">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap break-words m-0">
                            {displayContent}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
