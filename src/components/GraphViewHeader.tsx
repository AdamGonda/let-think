import { FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNavigator } from "@/components/StepNavigator";

type GraphViewHeaderProps = {
  sessionTitle: string | undefined;
  batchCount: number;
  selectedBatchIndex: number;
  onSelectBatch: (index: number) => void;
  hasChatHistory: boolean;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
};

export function GraphViewHeader({
  sessionTitle,
  batchCount,
  selectedBatchIndex,
  onSelectBatch,
  hasChatHistory,
  onHistoryOpen,
  onEditorOpen,
}: GraphViewHeaderProps) {
  const sessionLabel =
    sessionTitle != null && sessionTitle.trim() !== ""
      ? sessionTitle.trim()
      : "Loading…";

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 py-3 px-4 border-b border-border">
      <div className="min-w-0 max-w-[min(32rem,62vw)] pr-2">
        <p
          className="w-full truncate text-left text-xl font-semibold tracking-tight text-foreground"
          title={sessionLabel}
        >
          {sessionLabel}
        </p>
      </div>
      <div className="flex justify-center">
        <StepNavigator
          totalSteps={batchCount}
          selectedIndex={selectedBatchIndex}
          onSelect={onSelectBatch}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {hasChatHistory ? (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onHistoryOpen}
            title="Conversation history"
            aria-label="Conversation history"
            data-tour="history-btn"
          >
            <History className="size-5" />
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onEditorOpen}
          title="Open file"
          aria-label="Open file"
          data-tour="notes-btn"
        >
          <FileText className="size-5" />
        </Button>
      </div>
    </header>
  );
}
