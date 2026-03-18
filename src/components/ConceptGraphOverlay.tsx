import { useRef, useEffect, useState, useMemo } from "react";
import type { MutableRefObject } from "react";
import { Check, Clipboard, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GraphNode = {
  id: string;
  name: string;
  description?: string;
};

export type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{
    id: string;
    nodeIds: string[];
    promptSummary?: string;
    description?: string;
  }>;
};

interface ConceptGraphOverlayProps {
  graph: ConceptGraphData | null;
  className?: string;
  isLoading?: boolean;
  isDark?: boolean;
  /** Controlled batch index – when provided, navigation is controlled from parent */
  selectedBatchIndex?: number;
  onSelectedBatchIndexChange?: (index: number) => void;
  /** Ref to assign a function that opens the batch modal for a given index (for external trigger, e.g. top bar seed button) */
  openBatchModalRef?: MutableRefObject<((batchIndex: number) => void) | null>;
  /** Concept IDs referenced in chat (via @1, @2) – highlighted with glow */
  referencedConceptIds?: Set<string>;
}

export function ConceptGraphOverlay({
  graph,
  className,
  isLoading: _isLoading = false,
  isDark = false,
  selectedBatchIndex: controlledBatchIndex,
  onSelectedBatchIndexChange,
  openBatchModalRef,
  referencedConceptIds,
}: ConceptGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [batchModalIndex, setBatchModalIndex] = useState<number | null>(null);
  const [internalBatchIndex, setInternalBatchIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  const isControlled = controlledBatchIndex !== undefined && onSelectedBatchIndexChange != null;
  const selectedBatchIndex = isControlled ? controlledBatchIndex : internalBatchIndex;
  const setSelectedBatchIndex = isControlled
    ? onSelectedBatchIndexChange
    : setInternalBatchIndex;

  // Build batches: use graph.batches, or fallback to single batch with all nodes
  const batches = useMemo(() => {
    const b = graph?.batches ?? [];
    if (b.length > 0) return b;
    if (graph?.nodes?.length) {
      return [
        {
          id: "batch-0",
          nodeIds: graph.nodes.map((n) => n.id),
        },
      ];
    }
    return [];
  }, [graph?.batches, graph?.nodes]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    graph?.nodes?.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph?.nodes]);

  useEffect(() => {
    if (!openBatchModalRef) return;
    openBatchModalRef.current = (batchIndex: number) => {
      if (batches[batchIndex]?.description) {
        setBatchModalIndex(batchIndex);
      }
    };
    return () => {
      openBatchModalRef.current = null;
    };
  }, [openBatchModalRef, batches]);

  // When a new batch arrives, jump to it to show the most up-to-date batch (uncontrolled only)
  const prevBatchesLengthRef = useRef(0);
  const prevBatchIndexRef = useRef(selectedBatchIndex);

  // Slide animation – only during batch transition, removed after so hover can't replay it
  const [isAnimating, setIsAnimating] = useState(false);
  const slideDirectionRef = useRef<"left" | "right">("left");
  useEffect(() => {
    const prev = prevBatchIndexRef.current;
    if (selectedBatchIndex !== prev) {
      slideDirectionRef.current =
        selectedBatchIndex > prev ? "right" : "left";
      prevBatchIndexRef.current = selectedBatchIndex;
      setIsAnimating(true);
    }
  }, [selectedBatchIndex]);

  const handleBatchAnimationEnd = () => {
    setIsAnimating(false);
  };

  useEffect(() => {
    if (batches.length === 0 || isControlled) return;
    const prevLen = prevBatchesLengthRef.current;
    prevBatchesLengthRef.current = batches.length;
    if (batches.length > prevLen) {
      setSelectedBatchIndex(batches.length - 1);
    } else {
      setSelectedBatchIndex(Math.min(selectedBatchIndex, batches.length - 1));
    }
  }, [batches.length, isControlled, selectedBatchIndex]);

  const isEmpty = !graph?.nodes?.length;

  // Current batch nodes only – single-batch view
  const currentBatchNodes = useMemo(() => {
    const safeIndex = Math.min(
      Math.max(0, selectedBatchIndex),
      Math.max(0, batches.length - 1)
    );
    const batch = batches[safeIndex];
    if (!batch?.nodeIds?.length) return [];
    return batch.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n != null)
      .map((node, i) => ({ node, number: i + 1 }));
  }, [batches, selectedBatchIndex, nodeMap]);

  const isLatestBatch =
    batches.length > 0 && selectedBatchIndex === batches.length - 1;

  return (
    <div
      ref={containerRef}
      className={className ?? "flex flex-1 min-w-0 min-h-0 flex-col"}
      style={{ width: "100%", height: "100%" }}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400 text-2xl py-6 px-6">
          LET THINK
        </div>
      ) : (
        <>
          {batchModalIndex != null && batches[batchModalIndex]?.description && (
            <Dialog
              open
              onOpenChange={(open) => !open && setBatchModalIndex(null)}
            >
              <DialogContent
                className="w-[960px] max-w-[95vw] max-h-[80vh] flex flex-col p-0 gap-0"
                showCloseButton={false}
              >
                <DialogHeader className="flex flex-row items-center justify-between shrink-0 px-6 py-4 border-b border-border">
                  <DialogTitle id="batch-modal-title">User Input</DialogTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        const text = batches[batchModalIndex]?.description ?? "";
                        await navigator.clipboard.writeText(text);
                        toast.success("Copied to clipboard");
                        if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
                        setCopied(true);
                        copiedTimeoutRef.current = setTimeout(() => {
                          setCopied(false);
                          copiedTimeoutRef.current = null;
                        }, 2000);
                      }}
                      aria-label={copied ? "Copied" : "Copy to clipboard"}
                    >
                      {copied ? (
                        <Check size={20} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clipboard size={20} strokeWidth={2} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setBatchModalIndex(null)}
                      aria-label="Close"
                    >
                      <X size={20} strokeWidth={2} />
                    </Button>
                  </div>
                </DialogHeader>
                <div
                  className="overflow-y-auto overscroll-contain p-6 min-h-0"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <pre className="text-left text-foreground whitespace-pre-wrap leading-relaxed text-sm font-mono">
                    {batches[batchModalIndex]!.description}
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <div
            ref={graphViewportRef}
            className="flex flex-1 min-h-0 min-w-0 overflow-auto relative py-4"
          >
            <div
              key={selectedBatchIndex}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 w-full h-full ${
                isAnimating
                  ? slideDirectionRef.current === "right"
                    ? "animate-batch-from-right"
                    : "animate-batch-from-left"
                  : ""
              }`}
              style={{ gridAutoRows: "minmax(200px, 1fr)" }}
              onAnimationEnd={handleBatchAnimationEnd}
            >
              {currentBatchNodes.map(({ node, number }) => {
                const isHovered = hoveredNode?.id === node.id;
                const showDescription = isHovered && node.description;
                const isReferenced = referencedConceptIds?.has(node.id);
                const showNumberBadge = isLatestBatch;

                return (
                  <Card
                    key={node.id}
                    size="sm"
                    className="relative flex min-h-[200px] flex-col h-full transition-colors duration-200"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      boxShadow: isReferenced
                        ? isDark
                          ? "0 0 0 2px rgb(52, 211, 153)"
                          : "0 0 0 2px rgb(16, 185, 129)"
                        : undefined,
                    }}
                  >
                    {showNumberBadge && (
                      <div
                        className="absolute top-3 right-3 flex items-center justify-center size-8 rounded-full bg-muted text-foreground text-sm font-semibold"
                        style={{
                          outline: isReferenced
                            ? isDark
                              ? "2px solid rgb(52, 211, 153)"
                              : "2px solid rgb(16, 185, 129)"
                            : undefined,
                          outlineOffset: 2,
                        }}
                      >
                        {number}
                      </div>
                    )}
                    <CardHeader className="pr-10">
                      <CardTitle className="text-xl">{node.name}</CardTitle>
                    </CardHeader>
                    {node.description ? (
                      <CardContent
                        className={`flex-1 min-h-0 overflow-y-auto text-muted-foreground text-base leading-relaxed transition-opacity duration-200 ${
                          showDescription ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {node.description}
                      </CardContent>
                    ) : (
                      <div className="flex-1 min-h-0" aria-hidden />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
