import {
  FileText,
  History,
  LayoutGrid,
  MessageSquare,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { layout } from "@/config";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import { StepNavigator } from "@/components/navigation/StepNavigator";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/machines/appUiTypes";

const SESSION_VIEW_OPTIONS: ReadonlyArray<{
  view: SessionView;
  label: string;
  Icon: LucideIcon;
}> = [
  { view: "graph", label: "Graph view", Icon: LayoutGrid },
  { view: "chat", label: "Chat view", Icon: MessageSquare },
  { view: "canvas", label: "Canvas view", Icon: Pencil },
];

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
  const selectedIndex = SESSION_VIEW_OPTIONS.findIndex(
    (option) => option.view === sessionView,
  );
  const highlightTranslate =
    selectedIndex === 1
      ? "translate-x-full"
      : selectedIndex === 2
        ? "translate-x-[200%]"
        : "translate-x-0";

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
        <div
          role="radiogroup"
          aria-label="Session view"
          className="relative flex h-7 w-[5.25rem] shrink-0 overflow-hidden rounded-[min(var(--radius-md),12px)] border border-border bg-background dark:border-input dark:bg-input/30"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 w-1/3 rounded-[inherit] bg-foreground/15 shadow-[inset_0_0_0_1px] shadow-foreground/40 transition-transform duration-75 ease-out motion-reduce:transition-none",
              highlightTranslate,
            )}
          />
          {SESSION_VIEW_OPTIONS.map(({ view, label, Icon }) => {
            const selected = sessionView === view;
            return (
              <button
                key={view}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                title={label}
                className={cn(
                  "relative z-10 flex size-7 appearance-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-75 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground/55",
                )}
                onClick={() => {
                  if (view !== sessionView) onSessionViewChange(view);
                }}
              >
                <Icon className={cn("size-4", selected && "fill-current")} />
              </button>
            );
          })}
        </div>
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
