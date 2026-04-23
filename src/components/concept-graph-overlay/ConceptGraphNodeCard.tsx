import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { GraphNode } from "./useConceptGraphOverlayModel";

type ConceptGraphNodeCardProps = {
  node: GraphNode;
  number: number;
  isLatestBatch: boolean;
  isReferenced: boolean;
  interactionBlocked: boolean;
  isHovered: boolean;
  copyFeedbackVisible: boolean;
  isCopyJustDone: boolean;
  animateIn?: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onReferenceClick?: (conceptNumber: number) => void;
  onCopyClick?: (node: GraphNode) => void;
};

export function ConceptGraphNodeCard({
  node,
  number,
  isLatestBatch,
  isReferenced,
  interactionBlocked,
  isHovered,
  copyFeedbackVisible,
  isCopyJustDone,
  animateIn = false,
  onHoverStart,
  onHoverEnd,
  onReferenceClick,
  onCopyClick,
}: ConceptGraphNodeCardProps) {
  const showDescription = isHovered && node.description;
  const showNumberBadge = isLatestBatch;

  return (
    <Card
      size="sm"
      cornerRipple
      className={clsx(
        "relative flex h-full min-h-[200px] flex-col transition-colors duration-200",
        animateIn && "animate-in fade-in-0",
        isReferenced && interactionBlocked && "session-accent-ref-glow-pulse",
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={{
        boxShadow:
          isReferenced && !interactionBlocked
            ? "0 0 0 2px var(--session-accent)"
            : undefined,
      }}
    >
      {showNumberBadge &&
        (onReferenceClick ? (
          <button
            type="button"
            className={clsx(
              "absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 pointer-events-auto cursor-pointer transition-colors hover:bg-muted/80",
              isReferenced &&
                interactionBlocked &&
                "session-accent-ref-outline-pulse",
            )}
            aria-label={`Add or remove @${number} in message`}
            onClick={() => onReferenceClick(number)}
            style={{
              outline: isReferenced ? "2px solid var(--session-accent)" : undefined,
              outlineOffset: 2,
            }}
          >
            {number}
          </button>
        ) : (
          <div
            className={clsx(
              "absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 pointer-events-auto",
              isReferenced &&
                interactionBlocked &&
                "session-accent-ref-outline-pulse",
            )}
            style={{
              outline: isReferenced ? "2px solid var(--session-accent)" : undefined,
              outlineOffset: 2,
            }}
          >
            {number}
          </div>
        ))}
      <div
        className={clsx(
          "absolute inset-0 pointer-events-none flex items-center justify-center px-6 py-4 transition-opacity duration-200",
          showDescription ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <CardTitle className="text-xl sm:text-2xl font-semibold text-center">
          {node.name}
        </CardTitle>
      </div>
      {node.description && (
        <div
          className={clsx(
            "absolute inset-0 pointer-events-none flex flex-col p-6 overflow-hidden transition-all duration-200 ease-out",
            showDescription
              ? "opacity-100 translate-y-0"
              : "opacity-0 pointer-events-none translate-y-2",
          )}
        >
          <CardTitle className="text-lg sm:text-xl lg:text-xl xl:text-2xl font-semibold shrink-0 text-left pr-10">
            {node.name}
          </CardTitle>
          <CardContent
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-muted-foreground text-sm sm:text-base lg:text-lg xl:text-xl sm:leading-relaxed lg:leading-normal pt-4 text-left px-0"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {node.description}
          </CardContent>
        </div>
      )}
      {showNumberBadge && onCopyClick && (
        <button
          type="button"
          className={clsx(
            "absolute bottom-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold z-20 cursor-pointer",
            "transition-opacity duration-200 ease-out",
            "hover:bg-muted/80 hover:text-foreground",
            copyFeedbackVisible
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          aria-label={
            isCopyJustDone ? `Copied ${node.name}` : `Copy ${node.name} to clipboard`
          }
          onClick={(e) => {
            e.stopPropagation();
            onCopyClick(node);
          }}
        >
          {isCopyJustDone ? (
            <span className="animate-concept-copy-tick">
              <Check className="size-3.5 text-green-600" aria-hidden="true" />
            </span>
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </Card>
  );
}
