import { useState } from "react";
import type { ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2, X, Copy } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const COLLAPSE_THRESHOLD = 180;
/** Show loading for topic only if message is this recent (ms) – prevents indefinite spinner on failures */
const TOPIC_LOADING_TIMEOUT_MS = 30_000;

function truncateAtWord(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  const cut = content.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const end = lastSpace > maxLen * 0.5 ? lastSpace : maxLen;
  return cut.slice(0, end).trim();
}

/** Render content with mention spans styled as pills. */
function renderContentWithMentions(
  content: string,
  mentions?: Mention[],
  truncateLen?: number
): ReactNode {
  const truncated = truncateLen && content.length > truncateLen;
  const display = truncated
    ? truncateAtWord(content, truncateLen) + "…"
    : content;
  const contentEnd = truncated ? display.length - 1 : display.length;

  if (!mentions?.length) return display;

  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const segments: Array<{ type: "text" | "mention"; content: string; name: string }> = [];
  let pos = 0;
  for (const m of sorted) {
    if (m.start > pos) {
      segments.push({
        type: "text",
        content: display.slice(pos, Math.min(m.start, contentEnd)),
        name: "",
      });
    }
    if (m.start < contentEnd) {
      const end = Math.min(m.end, contentEnd);
      segments.push({
        type: "mention",
        content: display.slice(m.start, end),
        name: m.name,
      });
    }
    pos = Math.max(pos, m.end);
  }
  if (pos < contentEnd) {
    segments.push({ type: "text", content: display.slice(pos, contentEnd), name: "" });
  }
  if (truncated) {
    segments.push({ type: "text", content: "…", name: "" });
  }

  return (
    <>
      {segments.map((s, i) =>
        s.type === "mention" ? (
          <span
            key={`${s.name}-${i}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border"
            title={s.name}
          >
            {s.content}
          </span>
        ) : (
          s.content
        )
      )}
    </>
  );
}

interface Mention {
  start: number;
  end: number;
  conceptId: string;
  name: string;
}

interface UserMessage {
  _id?: Id<"messages">;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  topic?: string;
  /** @deprecated Legacy field, use topic */
  subject?: string;
  /** Mention spans (user messages) – for styling @ references */
  mentions?: Mention[];
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
  /** Currently selected batch/step index (synced with main view pagination) */
  selectedBatchIndex?: number;
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
  selectedBatchIndex = 0,
  onNavigateToStep,
}: ChatHistoryPanelProps) {
  const userMessages = messages.filter((m) => m.role === "user");
  const displayOrder = [...userMessages].reverse();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleCopy = (e: React.MouseEvent, content: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
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
          {userMessages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No messages yet. Start a conversation to see your history here.
            </p>
          ) : (
            <div className="relative">
              <ul className="flex flex-col gap-0 list-none p-0 m-0">
                {displayOrder.map((msg, index) => {
                  const key = (msg._id as string) ?? `msg-${index}`;
                  const isLong = msg.content.length > COLLAPSE_THRESHOLD;
                  const isExpanded = expandedIds.has(key);
                  const showFull = !isLong || isExpanded;

                  const msgNorm = normalizeForMatch(msg.content);
                  const batchIndex =
                    msgNorm !== ""
                      ? batches.findIndex(
                          (b) => b.description && normalizeForMatch(b.description) === msgNorm
                        )
                      : -1;
                  const hasStep = batchIndex >= 0;
                  const isSelectedStep = hasStep && batchIndex === selectedBatchIndex;

                  const dotBase = "absolute left-[7px] top-3 size-3 -translate-x-1/2 shrink-0 ring-4 ring-background z-10 rounded-full";
                  const dotSelected = "bg-[#1447E6]";
                  const dotRest = "bg-foreground";

                  return (
                    <li
                      key={key}
                      className="relative flex pb-6 last:pb-0"
                    >
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
                            const topic = topicOrSubject || truncateAtWord(msg.content, 60) + (msg.content.length > 60 ? "…" : "");
                            const hasHeader = isPendingTopic || !!topic;
                            const headerClassName = "rounded-t-md -mx-4 -mt-3 mb-3 px-4 py-2 bg-muted/80 border-b border-border";
                            return (
                        <div className="group/card relative rounded-2xl rounded-tl-md px-4 py-3 bg-muted text-foreground text-[0.95rem] leading-relaxed shadow-sm border border-border">
                          {hasHeader && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="absolute right-1 top-1 h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 bg-background/80 rounded-md"
                              onClick={(e) => handleCopy(e, msg.content)}
                              aria-label="Copy message"
                              title="Copy message"
                            >
                              <Copy className="size-3.5" />
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
                                <div className={`header-section ${headerClassName}`} title={topicOrSubject ?? msg.content}>
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
                              showFull ? undefined : COLLAPSE_THRESHOLD
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
