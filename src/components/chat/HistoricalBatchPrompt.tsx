import {
  useState,
  useLayoutEffect,
  useEffect,
  useRef,
  type TransitionEvent,
} from "react";
import { clsx } from "clsx";
import { Check, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { layout } from "@/config";
import { timings } from "@/config";
import { Button } from "@/components/ui/button";
import { renderContentWithMentions } from "@/lib/chatHistoryRender";
import type { HistoryMention } from "@/lib/chatHistoryMentionSegments";

type HistoricalBatchPromptProps = {
  content: string;
  mentions?: HistoryMention[];
  sessionLoadingFrame?: boolean;
  sessionPastFrame?: boolean;
  autoCollapseSignal?: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Read-only prompt for a non-latest graph batch: collapsed bar matches composer height.
 * Expanded state uses the same chrome, absolutely positioned within main (not fixed to the viewport)
 * so horizontal alignment matches the in-flow dock beside the sidebar.
 */
export function HistoricalBatchPrompt({
  content,
  mentions,
  sessionLoadingFrame = false,
  sessionPastFrame = false,
  autoCollapseSignal = "",
}: HistoricalBatchPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Body region: grid 1fr (open) vs 0fr (collapsed height animation). */
  const [bodyExpanded, setBodyExpanded] = useState(false);
  /** True while height is animating closed; blocks input until unmount. */
  const [isCollapsing, setIsCollapsing] = useState(false);
  const openRafRef = useRef<number | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Set when close starts; transitionend reads this so we don’t unmount on expand-end. */
  const collapseClosePendingRef = useRef(false);
  const trimmed = content.trim();

  useLayoutEffect(() => {
    if (!expanded) {
      setBodyExpanded(false);
      collapseClosePendingRef.current = false;
      return;
    }
    collapseClosePendingRef.current = false;
    if (prefersReducedMotion()) {
      setBodyExpanded(true);
      return;
    }
    setBodyExpanded(false);
    openRafRef.current = requestAnimationFrame(() => {
      openRafRef.current = null;
      setBodyExpanded(true);
    });
    return () => {
      if (openRafRef.current != null) {
        cancelAnimationFrame(openRafRef.current);
      }
    };
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    collapseClosePendingRef.current = false;
    setIsCollapsing(false);
    setBodyExpanded(false);
    setExpanded(false);
  }, [autoCollapseSignal]);

  const openPanel = () => {
    collapseClosePendingRef.current = false;
    setIsCollapsing(false);
    setExpanded(true);
  };

  const requestClose = () => {
    if (prefersReducedMotion()) {
      collapseClosePendingRef.current = false;
      setIsCollapsing(false);
      setExpanded(false);
      return;
    }
    collapseClosePendingRef.current = true;
    setIsCollapsing(true);
    setBodyExpanded(false);
  };

  const handleCopy = async () => {
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      toast.success("Copied to clipboard");
      if (copyFeedbackTimeoutRef.current != null) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      setCopied(true);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyFeedbackTimeoutRef.current = null;
      }, timings.copiedFeedbackMs);
    } catch {
      /* clipboard denied */
    }
  };

  const handleBodyTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "grid-template-rows") return;
    if (!collapseClosePendingRef.current) return;
    collapseClosePendingRef.current = false;
    setIsCollapsing(false);
    setExpanded(false);
  };

  const chromeBorderClass = sessionLoadingFrame
    ? "border-t-2 border-l-2 border-r-2 border-b-0 border-(--session-accent) session-loading-chat-chrome-pulse"
    : sessionPastFrame
      ? "border-t-2 border-l-2 border-r-2 border-b-0 session-past-chat-chrome-static"
      : "border border-b-0 border-border";

  const chromeShellClass = clsx(
    `w-full flex flex-col gap-3 rounded-t-2xl px-4 py-3 pb-4`,
    sessionPastFrame ? "shadow-none" : "shadow-lg",
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
                  isCollapsing && "pointer-events-none",
                  layout.mainColumnMaxWidthClass,
                )}
              >
                <div
                  className={clsx(
                    `flex w-full flex-col gap-3 rounded-t-2xl px-4 py-3 pb-4`,
                    sessionPastFrame ? "shadow-none" : "shadow-lg",
                    chromeBorderClass,
                  )}
                  style={{ backgroundColor: "#2B2B28" }}
                  role="dialog"
                  aria-label="User input"
                  aria-busy={isCollapsing}
                >
                  {/* Same pill row as collapsed (px-3, gap-3); close uses same chevron as collapsed, rotated 180°. */}
                  <div
                    className={clsx(
                      "flex w-full min-h-[48px] shrink-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 pl-4 pr-3",
                    )}
                  >
                    <button
                      type="button"
                      onClick={requestClose}
                      className={clsx(
                        "min-w-0 flex-1 cursor-pointer rounded-md px-0 py-1 text-left text-[0.95rem] leading-[1.5] font-normal text-muted-foreground transition-colors",
                        "hover:text-foreground/90",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                      aria-label="Close History prompt"
                    >
                      History prompt
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        aria-label={copied ? "Copied history prompt" : "Copy history prompt"}
                        title={copied ? "Copied" : "Copy history prompt"}
                      >
                        {copied ? (
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
                      <button
                        type="button"
                        onClick={requestClose}
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
                  </div>
                  <div
                    className={clsx(
                      "grid min-h-0 transition-[grid-template-rows] duration-150 ease-out",
                      bodyExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                    onTransitionEnd={handleBodyTransitionEnd}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="max-h-[min(55vh,24rem)] overflow-y-auto pr-0.5">
                        <p className="m-0 whitespace-pre-wrap break-words py-3 pl-4 pr-4 text-[0.95rem] leading-relaxed text-muted-foreground">
                          {renderContentWithMentions(trimmed, mentions)}
                        </p>
                      </div>
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
              onClick={openPanel}
              className={clsx(
                "w-full flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 pl-4 pr-3",
                "min-h-[48px] cursor-pointer transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-expanded={false}
            >
              <span className="text-[0.95rem] leading-[1.5] font-normal text-muted-foreground">
                History prompt
              </span>
              <ChevronUp
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <span className="sr-only">History prompt</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
