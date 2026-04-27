import { FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNavigator } from "@/components/navigation/StepNavigator";

type GraphViewHeaderProps = {
  sessionTitle: string | undefined;
  batchCount: number;
  selectedBatchIndex: number;
  onSelectBatch: (index: number) => void;
  isBatchNavigationDisabled?: boolean;
  hasChatHistory: boolean;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
  onSessionTitleClick: () => void;
};

export function GraphViewHeader({
  sessionTitle,
  batchCount,
  selectedBatchIndex,
  onSelectBatch,
  isBatchNavigationDisabled = false,
  hasChatHistory,
  onHistoryOpen,
  onEditorOpen,
  onSessionTitleClick,
}: GraphViewHeaderProps) {
  const sessionLabel =
    sessionTitle != null && sessionTitle.trim() !== ""
      ? sessionTitle.trim()
      : "Loading…";

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 py-3 px-4 border-b border-border">
      <div className="min-w-0 pr-2">
        <button
          type="button"
          onClick={onSessionTitleClick}
          data-tour="session-title"
          className="inline-block max-w-[min(32rem,62vw)] cursor-pointer truncate text-left text-xl font-semibold tracking-tight text-foreground rounded-lg px-3.5 py-0 -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title="Show on sidebar"
          aria-label={`Session: ${sessionLabel}. Click to show in sidebar.`}
        >
          {sessionLabel}
        </button>
      </div>
      <div className="flex justify-center">
        <StepNavigator
          totalSteps={batchCount}
          selectedIndex={selectedBatchIndex}
          onSelect={onSelectBatch}
          isDisabled={isBatchNavigationDisabled}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {hasChatHistory ? (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onHistoryOpen}
            title="Session history"
            aria-label="Session history"
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
