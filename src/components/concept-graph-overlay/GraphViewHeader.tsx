import { FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { layout } from "@/config";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import { StepNavigator } from "@/components/navigation/StepNavigator";

type GraphViewHeaderProps = {
  projectName: string | undefined;
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
  onProjectsRootClick: () => void;
  onProjectNameClick: () => void;
};

export function GraphViewHeader({
  projectName,
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
  onProjectsRootClick,
  onProjectNameClick,
}: GraphViewHeaderProps) {
  const sessionLabel =
    sessionTitle != null && sessionTitle.trim() !== ""
      ? sessionTitle.trim()
      : "Loading…";

  return (
    <header className={layout.workspaceTopBarClass}>
      <div className="min-w-0 pr-2">
        {projectName != null ? (
          <NoteBreadcrumb
            projectName={projectName}
            fileName={sessionLabel}
            interactive={!isSessionTitleDisabled}
            onProjectsRootClick={onProjectsRootClick}
            onProjectNameClick={onProjectNameClick}
          />
        ) : null}
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
      </div>
    </header>
  );
}
