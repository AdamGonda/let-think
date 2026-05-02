import { useCallback } from "react";
import { layout } from "@/config";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import type { Id } from "../../../convex/_generated/dataModel";

type WakeUpOverlayProps = {
  chatLoading: boolean;
  isExitingOverlay: boolean;
  editorOpen: boolean;
  overlayActionReturnsToGraph: boolean;
  onOverlayActionClick: () => void;
  editorRevealReady: boolean;
  activeSessionId: Id<"sessions"> | null;
  activeSessionInWorkspace:
    | {
        session: { title: string };
        projectName: string;
        projectId: Id<"projects"> | null;
      }
    | undefined;
  notes: string;
  notesSelectionRange: { start: number; end: number } | null;
  onNotesChange: (value: string) => void;
  onBreadcrumbProjectsRootClick: () => void;
  onBreadcrumbProjectNameClick: () => void;
};

export function WakeUpOverlay({
  chatLoading,
  isExitingOverlay,
  editorOpen,
  overlayActionReturnsToGraph,
  onOverlayActionClick,
  editorRevealReady,
  activeSessionId,
  activeSessionInWorkspace,
  notes,
  notesSelectionRange,
  onNotesChange,
  onBreadcrumbProjectsRootClick,
  onBreadcrumbProjectNameClick,
}: WakeUpOverlayProps) {
  const showFileNavBreadcrumb =
    editorOpen && !!activeSessionInWorkspace;
  /** Visible whenever the note overlay is active (breadcrumb loading state is separate). */
  const showBrainButton = editorOpen && !!activeSessionId;
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onNotesChange(value ?? "");
    },
    [onNotesChange],
  );

  return (
    <div
      className={`fixed inset-0 ${layout.wakeUpOverlayZIndexClass} flex h-screen w-screen flex-col bg-background ${
        isExitingOverlay ? "animate-wake-up-out" : "animate-wake-up-in"
      }`}
      aria-busy={chatLoading}
      aria-live="polite"
    >
      <div
        className={`flex flex-1 min-h-0 flex-col transition-opacity duration-75 ${
          isExitingOverlay ? "opacity-0" : "opacity-100"
        }`}
      >
        {showBrainButton ? (
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-4 z-20"
            onClick={onOverlayActionClick}
            aria-label={
              overlayActionReturnsToGraph
                ? "Return to concept graph"
                : "Summarize and return to session"
            }
          >
            <Brain className="size-5" />
          </Button>
        ) : null}
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start overflow-hidden px-6 pb-8 pt-2">
            {showFileNavBreadcrumb && activeSessionInWorkspace ? (
              <NoteBreadcrumb
                projectName={activeSessionInWorkspace.projectName}
                fileName={activeSessionInWorkspace.session.title}
                interactive={
                  editorRevealReady && !chatLoading && !isExitingOverlay
                }
                isExiting={isExitingOverlay}
                onProjectsRootClick={onBreadcrumbProjectsRootClick}
                onProjectNameClick={onBreadcrumbProjectNameClick}
              />
            ) : null}
            <div
              className={`relative flex min-h-0 w-full flex-1 flex-col justify-start overflow-y-auto transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                className={`mx-auto flex w-full min-h-0 flex-1 flex-col justify-start ${layout.mainColumnMaxWidthClass}`}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
