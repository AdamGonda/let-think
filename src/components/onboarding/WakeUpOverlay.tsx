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
  isPublished: boolean;
  publishConfirmDialog: { mode: "publish" | "unpublish" } | null;
  onOpenPublishConfirm: () => void;
  onOpenUnpublishConfirm: () => void;
  onClosePublishDialog: () => void;
  onConfirmPublish: () => void;
  onConfirmUnpublish: () => void;
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
  isPublished,
  publishConfirmDialog,
  onOpenPublishConfirm,
  onOpenUnpublishConfirm,
  onClosePublishDialog,
  onConfirmPublish,
  onConfirmUnpublish,
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
                  isPublished={isPublished}
                  onPublishClick={onOpenPublishConfirm}
                  onUnpublishClick={onOpenUnpublishConfirm}
                />
              ) : null}
              {editorOpen &&
              activeSessionInWorkspace &&
              showFileNoteBreadcrumbFromProjectNotes &&
              publishConfirmDialog ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={
                    publishConfirmDialog.mode === "publish"
                      ? "Confirm publish"
                      : "Confirm unpublish"
                  }
                  className="mb-3 rounded-lg border border-border/70 bg-card/95 p-3"
                >
                  <p className="text-sm text-foreground">
                    {publishConfirmDialog.mode === "publish"
                      ? "Publish these notes to /square so they are publicly visible?"
                      : "Unpublish these notes from /square?"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClosePublishDialog}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={
                        publishConfirmDialog.mode === "publish"
                          ? "default"
                          : "destructive"
                      }
                      size="sm"
                      onClick={
                        publishConfirmDialog.mode === "publish"
                          ? onConfirmPublish
                          : onConfirmUnpublish
                      }
                    >
                      {publishConfirmDialog.mode === "publish"
                        ? "Confirm publish"
                        : "Confirm unpublish"}
                    </Button>
                  </div>
                </div>
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
