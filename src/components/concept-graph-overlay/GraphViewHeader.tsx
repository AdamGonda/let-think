import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { layout } from "@/config";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import { StepNavigator } from "@/components/navigation/StepNavigator";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/machines/appUiTypes";
import { SessionViewSwitcher } from "./SessionViewSwitcher";

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
  sessionView: SessionView;
  onSessionViewChange: (view: SessionView) => void;
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
  sessionView,
  onSessionViewChange,
  onHistoryOpen,
  onEditorOpen,
  onProjectsRootClick,
  onProjectNameClick,
}: GraphViewHeaderProps) {
  const sessionLabel =
    sessionTitle != null && sessionTitle.trim() !== ""
      ? sessionTitle.trim()
      : "Loading…";
  const graphChromeHidden = sessionView !== "graph";
  const historyDisabled = !hasChatHistory || isHistoryButtonDisabled;

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
        {graphChromeHidden ? null : (
          <StepNavigator
            totalSteps={batchCount}
            selectedIndex={selectedBatchIndex}
            onSelect={onSelectBatch}
            isDisabled={isBatchNavigationDisabled}
          />
        )}
      </div>
      <div className="flex h-7 items-center justify-end gap-2 leading-none">
        {sessionView === "canvas" ? null : (
          <div
            className={cn(
              "relative flex size-7 shrink-0 items-center justify-center transition-opacity duration-75 ease-out motion-reduce:transition-none",
              graphChromeHidden && "pointer-events-none opacity-0",
            )}
            aria-hidden={graphChromeHidden || undefined}
          >
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onHistoryOpen}
              disabled={historyDisabled}
              title="Session history"
              aria-label="Session history"
              data-tour="history-btn"
            >
              <History className="size-5" />
            </Button>
            {historyDisabled ? (
              <div
                className="absolute inset-0 z-10 cursor-not-allowed rounded-[min(var(--radius-md),12px)]"
                aria-hidden
              />
            ) : null}
          </div>
        )}
        <SessionViewSwitcher
          selected={sessionView}
          onChange={(view) => {
            if (view === "file") onEditorOpen();
            else onSessionViewChange(view);
          }}
        />
      </div>
    </header>
  );
}
