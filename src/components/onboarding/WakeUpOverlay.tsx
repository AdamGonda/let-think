import { useCallback } from "react";
import { layout } from "@/config";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MainColumnWidthHandle } from "@/components/editor/MainColumnWidthHandle";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import {
  SessionViewSwitcher,
  type WorkspaceChromeView,
} from "@/components/concept-graph-overlay/SessionViewSwitcher";
import type { Id } from "../../../convex/_generated/dataModel";

type WakeUpOverlayProps = {
  chatLoading: boolean;
  isExitingOverlay: boolean;
  editorOpen: boolean;
  editorRevealReady: boolean;
  activeSessionId: Id<"sessions"> | null;
  activeSessionInWorkspace:
    | {
        file: { title: string };
        projectName: string;
        projectId: Id<"projects"> | null;
      }
    | undefined;
  notes: string;
  notesSelectionRange: { start: number; end: number } | null;
  onNotesChange: (value: string) => void;
  onBreadcrumbProjectsRootClick: () => void;
  onBreadcrumbProjectNameClick: () => void;
  onChromeViewChange: (view: WorkspaceChromeView) => void;
  mainColumnWidth: number;
  mainColumnWidthMin: number;
  mainColumnWidthMax: number;
  onMainColumnWidthChange: (width: number) => void;
};

export function WakeUpOverlay({
  chatLoading,
  isExitingOverlay,
  editorOpen,
  editorRevealReady,
  activeSessionId,
  activeSessionInWorkspace,
  notes,
  notesSelectionRange,
  onNotesChange,
  onBreadcrumbProjectsRootClick,
  onBreadcrumbProjectNameClick,
  onChromeViewChange,
  mainColumnWidth,
  mainColumnWidthMin,
  mainColumnWidthMax,
  onMainColumnWidthChange,
}: WakeUpOverlayProps) {
  const showFileNavBreadcrumb =
    editorOpen && !!activeSessionInWorkspace;
  const showViewSwitcher = editorOpen && !!activeSessionId;
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onNotesChange(value ?? "");
    },
    [onNotesChange],
  );

  return (
    <div
      className={`fixed inset-0 ${layout.wakeUpOverlayZIndexClass} flex h-screen w-screen flex-col bg-background ${
        isExitingOverlay ? "animate-wake-up-out" : ""
      }`}
      aria-busy={chatLoading}
      aria-live="polite"
    >
      <div
        className={`flex flex-1 min-h-0 flex-col transition-opacity duration-75 ${
          isExitingOverlay ? "opacity-0" : "opacity-100"
        }`}
      >
        {showViewSwitcher || showFileNavBreadcrumb ? (
          <header className={layout.workspaceTopBarClass}>
            <div className="min-w-0 pr-2">
              {showFileNavBreadcrumb && activeSessionInWorkspace ? (
                <NoteBreadcrumb
                  projectName={activeSessionInWorkspace.projectName}
                  fileName={activeSessionInWorkspace.file.title}
                  interactive={
                    editorRevealReady && !chatLoading && !isExitingOverlay
                  }
                  isExiting={isExitingOverlay}
                  onProjectsRootClick={onBreadcrumbProjectsRootClick}
                  onProjectNameClick={onBreadcrumbProjectNameClick}
                />
              ) : null}
            </div>
            <div />
            <div className="flex h-7 items-center justify-end">
              {showViewSwitcher ? (
                <SessionViewSwitcher
                  selected="file"
                  onChange={onChromeViewChange}
                />
              ) : null}
            </div>
          </header>
        ) : null}
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start overflow-hidden px-6 pb-8">
            <div
              className={`relative mx-auto flex w-full min-h-0 flex-1 flex-col justify-start ${layout.mainColumnMaxWidthClass}`}
            >
              <MarkdownEditor
                value={notes}
                onChange={handleEditorChange}
                selectionRange={notesSelectionRange}
                placeholder="Let's build out your idea..."
                variant="focused"
                dark={true}
                autoFocus
                autoFocusEnd
              />
              <MainColumnWidthHandle
                width={mainColumnWidth}
                min={mainColumnWidthMin}
                max={mainColumnWidthMax}
                onWidthChange={onMainColumnWidthChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
