import { FileText, History, LayoutGrid, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { layout } from "@/config";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import { StepNavigator } from "@/components/navigation/StepNavigator";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/machines/appUiTypes";

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
  const chatOpen = sessionView === "chat";
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
        {chatOpen ? null : (
          <StepNavigator
            totalSteps={batchCount}
            selectedIndex={selectedBatchIndex}
            onSelect={onSelectBatch}
            isDisabled={isBatchNavigationDisabled}
          />
        )}
      </div>
      <div className="flex h-7 items-center justify-end gap-2 leading-none">
        <div
          className={cn(
            "relative flex size-7 shrink-0 items-center justify-center transition-opacity duration-75 ease-out motion-reduce:transition-none",
            chatOpen && "pointer-events-none opacity-0",
          )}
          aria-hidden={chatOpen || undefined}
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
        <Button
          variant="outline"
          className="relative h-7 w-14 overflow-hidden rounded-[min(var(--radius-md),12px)] p-0 active:translate-y-0"
          onClick={() => onSessionViewChange(chatOpen ? "graph" : "chat")}
          title={chatOpen ? "Switch to graph view" : "Switch to chat view"}
          aria-label={chatOpen ? "Switch to graph view" : "Switch to chat view"}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 w-1/2 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
              chatOpen ? "translate-x-full" : "translate-x-0",
            )}
          />
          <span aria-hidden className="relative z-10 flex">
            <span
              className={cn(
                "flex size-7 items-center justify-center transition-colors duration-75",
                chatOpen ? "text-muted-foreground/55" : "text-foreground",
              )}
            >
              <LayoutGrid
                className={cn("size-4", !chatOpen && "fill-current")}
              />
            </span>
            <span
              className={cn(
                "flex size-7 items-center justify-center transition-colors duration-75",
                chatOpen ? "text-foreground" : "text-muted-foreground/55",
              )}
            >
              <MessageSquare
                className={cn("size-4", chatOpen && "fill-current")}
              />
            </span>
          </span>
        </Button>
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
