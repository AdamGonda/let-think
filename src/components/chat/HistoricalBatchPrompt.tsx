import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { layout } from "@/config";
import { renderContentWithMentions } from "@/lib/chatHistoryRender";
import type { HistoryMention } from "@/lib/chatHistoryMentionSegments";

type HistoricalBatchPromptProps = {
  content: string;
  mentions?: HistoryMention[];
  workModeLoadingFrame?: boolean;
};

/**
 * Read-only prompt for a non-latest graph batch: collapsed bar matches composer height.
 * Expanded content is absolutely positioned above the dock so it does not shrink the graph.
 */
export function HistoricalBatchPrompt({
  content,
  mentions,
  workModeLoadingFrame = false,
}: HistoricalBatchPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = content.trim();

  return (
    <div
      className="flex flex-col items-center px-4 pt-4 shrink-0"
      data-tour="session-input"
    >
      <div className={clsx("relative w-full", layout.mainColumnMaxWidthClass)}>
        {expanded && trimmed ? (
          <div
            className={clsx(
              "absolute bottom-full left-0 right-0 mb-2 flex flex-col rounded-2xl border border-border bg-muted text-foreground shadow-xl",
              layout.sessionInputExpandedOverlayZClass,
              "max-h-[min(55vh,24rem)] overflow-y-auto px-4 py-3",
            )}
            role="dialog"
            aria-label="User input"
          >
            <p className="whitespace-pre-wrap break-words m-0 text-[0.95rem] leading-relaxed">
              {renderContentWithMentions(trimmed, mentions)}
            </p>
          </div>
        ) : null}

        <div
          className={clsx(
            `w-full flex flex-col gap-3 rounded-t-2xl shadow-lg px-4 py-3 pb-4`,
            layout.sessionInputChromeMinClass,
            workModeLoadingFrame
              ? "border-t-2 border-l-2 border-r-2 border-b-0 border-(--session-accent) session-loading-chat-chrome-pulse"
              : "border border-b-0 border-border",
          )}
          style={{ backgroundColor: "#2B2B28" }}
        >
          {!trimmed ? (
            <p className="text-sm text-muted-foreground m-0 py-1 min-h-[48px] flex items-center">
              No saved prompt for this step.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={clsx(
                "w-full flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3",
                "min-h-[48px] cursor-pointer transition-colors hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-expanded={expanded}
            >
              <span className="text-sm font-medium text-foreground/90">
                see user input
              </span>
              {expanded ? (
                <ChevronUp
                  className="size-5 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              <span className="sr-only">
                {expanded ? "Hide user input" : "see user input"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
