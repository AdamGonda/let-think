import { FileText, History, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNavigator } from "@/components/navigation/StepNavigator";
import { UserCard } from "@/components/user/UserCard";

type GraphViewHeaderProps = {
  sessionTitle: string | undefined;
  batchCount: number;
  selectedBatchIndex: number;
  onSelectBatch: (index: number) => void;
  isBatchNavigationDisabled?: boolean;
  isSessionTitleDisabled?: boolean;
  isHistoryButtonDisabled?: boolean;
  hasChatHistory: boolean;
  onHistoryOpen: () => void;
  onEditorOpen: () => void;
  onOpenExplorer: () => void;
  onRunTutorial?: () => void;
};

export function GraphViewHeader({
  sessionTitle,
  batchCount,
  selectedBatchIndex,
  onSelectBatch,
  isBatchNavigationDisabled = false,
  isSessionTitleDisabled = false,
  isHistoryButtonDisabled = false,
  hasChatHistory,
  onHistoryOpen,
  onEditorOpen,
  onOpenExplorer,
  onRunTutorial,
}: GraphViewHeaderProps) {
  const sessionLabel =
    sessionTitle != null && sessionTitle.trim() !== ""
      ? sessionTitle.trim()
      : "Loading…";

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0 py-3 px-4 border-b border-border">
      <div className="min-w-0 pr-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenExplorer}
          disabled={isSessionTitleDisabled}
          title="Back to files"
          aria-label="Back to files"
        >
          <Compass className="size-5" />
        </Button>
        <button
          type="button"
          onClick={onOpenExplorer}
          disabled={isSessionTitleDisabled}
          data-tour="session-title"
          className={`inline-block max-w-[min(28rem,50vw)] truncate text-left text-xl font-semibold tracking-tight text-foreground rounded-lg px-3.5 py-0 -mx-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSessionTitleDisabled
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer hover:bg-muted/40"
          }`}
          title="Back to files"
          aria-label={`File: ${sessionLabel}. Click to go back to files.`}
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
          <div className="relative">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onHistoryOpen}
              disabled={isHistoryButtonDisabled}
              title="Session history"
              aria-label="Session history"
              data-tour="history-btn"
            >
              <History className="size-5" />
            </Button>
            {isHistoryButtonDisabled ? (
              <div
                className="absolute inset-0 z-10 cursor-not-allowed rounded-[min(var(--radius-md),12px)]"
                aria-hidden
              />
            ) : null}
          </div>
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
        <div className="relative h-7 w-7 shrink-0">
          <div className="absolute right-0 top-0 z-20 w-[13.5rem]">
            <UserCard compact onRunTutorial={onRunTutorial} />
          </div>
        </div>
      </div>
    </header>
  );
}
