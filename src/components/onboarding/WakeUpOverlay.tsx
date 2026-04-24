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
  showOverlayAction: boolean;
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
  /** True only when the session was opened from the Project notes grid (not the sidebar tree). */
  showFileNoteBreadcrumbFromProjectNotes: boolean;
  notes: string;
  notesSelectionRange: { start: number; end: number } | null;
  onNotesChange: (value: string) => void;
  onBreadcrumbProjectClick: () => void;
  onBreadcrumbSessionClick: () => void;
  onBreadcrumbFileClick: () => void;
};

export function WakeUpOverlay({
  chatLoading,
  isExitingOverlay,
  editorOpen,
  showOverlayAction,
  overlayActionReturnsToGraph,
  onOverlayActionClick,
  editorRevealReady,
  activeSessionId,
  activeSessionInWorkspace,
  showFileNoteBreadcrumbFromProjectNotes,
  notes,
  notesSelectionRange,
  onNotesChange,
  onBreadcrumbProjectClick,
  onBreadcrumbSessionClick,
  onBreadcrumbFileClick,
}: WakeUpOverlayProps) {
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
        {showOverlayAction ? (
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-4 z-10"
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
          <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start px-6 pb-8 pt-2 overflow-hidden">
            <div
              className={`relative flex w-full flex-1 min-h-0 flex-col justify-start overflow-y-auto transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              {editorOpen &&
              activeSessionInWorkspace &&
              showFileNoteBreadcrumbFromProjectNotes ? (
                <NoteBreadcrumb
                  projectName={activeSessionInWorkspace.projectName}
                  sessionName={activeSessionInWorkspace.session.title}
                  onProjectClick={onBreadcrumbProjectClick}
                  onSessionClick={onBreadcrumbSessionClick}
                  onFileClick={onBreadcrumbFileClick}
                />
              ) : null}
              <div
                className={`mx-auto flex w-full min-h-0 flex-1 flex-col justify-start ${layout.mainColumnMaxWidthClass}`}
              >
                <MarkdownEditor
                  value={notes}
                  onChange={(v) => onNotesChange(v ?? "")}
                  selectionRange={notesSelectionRange}
                  placeholder="Take notes…"
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
