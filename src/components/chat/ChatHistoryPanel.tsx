import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2, X, Copy, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { HistoryMention } from "@/lib/chatHistoryMentionSegments";
import {
  CHAT_HISTORY_COLLAPSE_THRESHOLD,
  TOPIC_LOADING_TIMEOUT_MS,
  truncateAtWord,
  renderContentWithMentions,
} from "@/lib/chatHistoryRender";
import { timings } from "@/config";

interface UserMessage {
  _id?: Id<"messages">;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  topic?: string;
  subject?: string;
  mentions?: HistoryMention[];
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
  messages: UserMessage[];
  onLoadOlderMessages?: () => void;
  canLoadOlderMessages?: boolean;
  batches?: Batch[];
  selectedBatchIndex?: number;
  onNavigateToStep?: (batchIndex: number) => void;
}

function normalizeForMatch(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function ChatHistoryPanel({
  isOpen,
  onClose,
  messages,
  onLoadOlderMessages,
  canLoadOlderMessages = false,
  batches = [],
  selectedBatchIndex = 0,
  onNavigateToStep,
}: ChatHistoryPanelProps) {
  const userMessages = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages],
  );
  const displayOrder = [...userMessages].reverse();

  const batchIndexByChronoIndex = useMemo(() => {
    const result = new Array<number>(userMessages.length).fill(-1);
    const usedMessageIndices = new Set<number>();
    for (let b = 0; b < batches.length; b++) {
      const raw = batches[b]?.description;
      if (!raw) continue;
      const norm = normalizeForMatch(raw);
      if (!norm) continue;
      const idx = userMessages.findIndex(
        (m, i) =>
          !usedMessageIndices.has(i) && normalizeForMatch(m.content) === norm,
      );
      if (idx >= 0) {
        result[idx] = b;
        usedMessageIndices.add(idx);
      }
    }
    return result;
  }, [userMessages, batches]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (
    e: MouseEvent<HTMLButtonElement>,
    content: string,
    key: string,
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      setCopiedKey(key);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
        copyFeedbackTimeoutRef.current = null;
      }, timings.copiedFeedbackMs);
    } catch {
      /* clipboard denied */
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-sm flex flex-col p-0"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center gap-2 shrink-0 py-4 px-4 border-b border-border">
          <SheetTitle className="text-lg font-semibold">
            Conversation history
          </SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close history"
            onClick={onClose}
            className="ml-auto"
          >
            <X className="size-5" />
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-6 px-4">
          {canLoadOlderMessages && onLoadOlderMessages && (
            <div className="flex justify-center pb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={onLoadOlderMessages}
              >
                Load older messages
              </Button>
            </div>
          )}
          {userMessages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No messages yet. Start a conversation to see your history here.
            </p>
          ) : (
            <div className="relative">
              <ul className="flex flex-col gap-0 list-none p-0 m-0">
                {displayOrder.map((msg, index) => {
                  const key = (msg._id as string) ?? `msg-${index}`;
                  const isLong =
                    msg.content.length > CHAT_HISTORY_COLLAPSE_THRESHOLD;
                  const isExpanded = expandedIds.has(key);
                  const showFull = !isLong || isExpanded;

                  const chronoIndex = userMessages.length - 1 - index;
                  const batchIndex = batchIndexByChronoIndex[chronoIndex] ?? -1;
                  const hasStep = batchIndex >= 0;
                  const isSelectedStep =
                    hasStep && batchIndex === selectedBatchIndex;

                  const dotBase =
                    "absolute left-[7px] top-3 size-3 -translate-x-1/2 shrink-0 ring-4 ring-background z-10 rounded-full";
                  const dotSelected = "bg-[var(--session-accent)]";
                  const dotRest = "bg-foreground";

                  return (
                    <li key={key} className="relative flex pb-6 last:pb-0">
                      {hasStep && onNavigateToStep ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToStep(batchIndex)}
                          className={`${dotBase} ${isSelectedStep ? dotSelected : dotRest} cursor-pointer hover:scale-125 [li:has(.header-section:hover)_&]:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
                          title="Go to this step in the graph"
                          aria-label={`Go to step ${batchIndex + 1} in graph`}
                        />
                      ) : (
                        <div
                          className={`${dotBase} ${isSelectedStep ? dotSelected : dotRest} hover:scale-125 [li:has(.header-section:hover)_&]:scale-125 transition-transform`}
                          aria-hidden
                        />
                      )}
                      <div className="flex-1 min-w-0 pl-2">
                        {(() => {
                          const topicOrSubject = (msg.topic ?? msg.subject)?.trim();
                          const isPendingTopic =
                            !topicOrSubject &&
                            msg.content.trim() &&
                            msg.createdAt != null &&
                            Date.now() - msg.createdAt < TOPIC_LOADING_TIMEOUT_MS;
                          const topic =
                            topicOrSubject ||
                            truncateAtWord(msg.content, 60) +
                              (msg.content.length > 60 ? "…" : "");
                          const hasHeader = isPendingTopic || !!topic;
                          const headerClassName =
                            "rounded-t-md -mx-4 -mt-3 mb-3 px-4 py-2 bg-muted/80 border-b border-border";
                          return (
                            <div className="group/card relative rounded-2xl rounded-tl-md px-4 py-3 bg-muted text-foreground text-[0.95rem] leading-relaxed shadow-sm border border-border">
                              {hasHeader && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="absolute right-1 top-1 h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 bg-background/80 rounded-md"
                                  onClick={(e) => handleCopy(e, msg.content, key)}
                                  aria-label={
                                    copiedKey === key ? "Copied" : "Copy message"
                                  }
                                  title={
                                    copiedKey === key ? "Copied" : "Copy message"
                                  }
                                >
                                  {copiedKey === key ? (
                                    <span className="animate-concept-copy-tick">
                                      <Check
                                        className="size-3.5 text-green-600"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : (
                                    <Copy className="size-3.5" aria-hidden="true" />
                                  )}
                                </Button>
                              )}
                              {isPendingTopic ? (
                                <div
                                  className={`header-section ${headerClassName} flex items-center gap-2`}
                                  role="status"
                                  aria-label="Generating summary"
                                >
                                  <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
                                  <span className="text-[0.7rem] font-medium text-muted-foreground">
                                    Generating summary…
                                  </span>
                                </div>
                              ) : topic ? (
                                hasStep && onNavigateToStep ? (
                                  <button
                                    type="button"
                                    className={`header-section ${headerClassName} w-full text-left cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
                                    title="Go to this step in the graph"
                                    aria-label={`Go to step ${batchIndex + 1} in graph`}
                                    onClick={() => onNavigateToStep(batchIndex)}
                                  >
                                    <p className="text-[0.7rem] font-bold text-foreground/80 uppercase tracking-wider line-clamp-2 m-0">
                                      {topic}
                                    </p>
                                  </button>
                                ) : (
                                  <div
                                    className={`header-section ${headerClassName}`}
                                    title={topicOrSubject ?? msg.content}
                                  >
                                    <p className="text-[0.7rem] font-bold text-foreground/80 uppercase tracking-wider line-clamp-2 m-0">
                                      {topic}
                                    </p>
                                  </div>
                                )
                              ) : null}
                              {isLong ? (
                                <div className="flex flex-wrap items-center justify-end gap-2 -mt-1 mb-2">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => toggleExpanded(key)}
                                  >
                                    {isExpanded ? "Show less" : "Show more"}
                                  </Button>
                                </div>
                              ) : null}
                              <p className="whitespace-pre-wrap break-words m-0">
                                {renderContentWithMentions(
                                  msg.content,
                                  msg.mentions,
                                  showFull
                                    ? undefined
                                    : CHAT_HISTORY_COLLAPSE_THRESHOLD,
                                )}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
