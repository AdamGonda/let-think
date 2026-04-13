import { useState } from "react";
import { clsx } from "clsx";
import { ChevronUp } from "lucide-react";
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
 * Expanded state uses the same chrome, absolutely positioned within main (not fixed to the viewport)
 * so horizontal alignment matches the in-flow dock beside the sidebar.
 */
export function HistoricalBatchPrompt({
  content,
  mentions,
  workModeLoadingFrame = false,
}: HistoricalBatchPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = content.trim();

  const chromeBorderClass = workModeLoadingFrame
    ? "border-t-2 border-l-2 border-r-2 border-b-0 border-(--session-accent) session-loading-chat-chrome-pulse"
    : "border border-b-0 border-border";

  const chromeShellClass = clsx(
    `w-full flex flex-col gap-3 rounded-t-2xl shadow-lg px-4 py-3 pb-4`,
    layout.sessionInputChromeMinClass,
    chromeBorderClass,
  );

  return (
    <div
      className="flex flex-col items-center px-4 pt-4 shrink-0"
      data-tour="session-input"
    >
      <div className={clsx("w-full", layout.mainColumnMaxWidthClass)}>
        {!trimmed ? (
          <div
            className={clsx(chromeShellClass)}
            style={{ backgroundColor: "#2B2B28" }}
          >
            <p className="text-sm text-muted-foreground m-0 py-1 min-h-[48px] flex items-center">
              No saved prompt for this step.
            </p>
          </div>
        ) : expanded ? (
          <>
            {/* Keeps graph height identical to collapsed dock; expanded UI overlays the graph in main. */}
            <div className="invisible pointer-events-none w-full" aria-hidden>
              <div
                className={chromeShellClass}
                style={{ backgroundColor: "#2B2B28" }}
              >
                <div className="flex min-h-[48px] w-full items-center rounded-xl border border-border/70 bg-background/60 px-3" />
              </div>
            </div>
            <div
              className={clsx(
                "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(0px,env(safe-area-inset-bottom))]",
                layout.sessionInputExpandedOverlayZClass,
              )}
            >
              <div
                className={clsx(
                  "pointer-events-auto w-full",
                  layout.mainColumnMaxWidthClass,
                )}
              >
                <div
                  className={clsx(
                    `w-full flex flex-col gap-3 rounded-t-2xl shadow-lg px-4 py-3 pb-4`,
                    chromeBorderClass,
                  )}
                  style={{ backgroundColor: "#2B2B28" }}
                  role="dialog"
                  aria-label="User input"
                >
                  <div className="flex max-h-[min(55vh,24rem)] min-h-0 flex-col gap-3 overflow-hidden">
                    {/* Same pill row as collapsed (px-3, gap-3); close uses same chevron as collapsed, rotated 180°. */}
                    <div
                      className={clsx(
                        "flex w-full min-h-[48px] shrink-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        className={clsx(
                          "min-w-0 flex-1 cursor-pointer rounded-md px-0 py-1 text-left text-sm font-medium text-foreground/90 transition-colors",
                          "hover:text-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        )}
                        aria-label="Close user input"
                      >
                        see user input
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        className={clsx(
                          "flex shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground transition-colors",
                          "hover:text-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        )}
                        aria-label="Close"
                      >
                        <ChevronUp
                          className="size-5 shrink-0 rotate-180 text-muted-foreground"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                      <p className="whitespace-pre-wrap break-words m-0 text-[0.95rem] leading-relaxed text-foreground">
                        {renderContentWithMentions(trimmed, mentions)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            className={clsx(chromeShellClass)}
            style={{ backgroundColor: "#2B2B28" }}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={clsx(
                "w-full flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3",
                "min-h-[48px] cursor-pointer transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-expanded={false}
            >
              <span className="text-sm font-medium text-foreground/90">
                see user input
              </span>
              <ChevronUp
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <span className="sr-only">see user input</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
