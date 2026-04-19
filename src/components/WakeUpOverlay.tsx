import { layout } from "@/config";
import { FileText, Gamepad2, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/NoteBreadcrumb";
import type { Id } from "../../convex/_generated/dataModel";
import type { TopAppTarget } from "@/machines/appUiTypes";

type WakeUpOverlayProps = {
  chatLoading: boolean;
  isExitingOverlay: boolean;
  editorOpen: boolean;
  showOverlaySigma: boolean;
  sigmaEditorFromSession: boolean;
  onSigmaClick: () => void;
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
  topAppTarget: TopAppTarget;
  onTopAppTargetChange: (target: TopAppTarget) => void;
};

export function WakeUpOverlay({
  chatLoading,
  isExitingOverlay,
  editorOpen,
  showOverlaySigma,
  sigmaEditorFromSession,
  onSigmaClick,
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
  topAppTarget,
  onTopAppTargetChange,
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
        {showOverlaySigma ? (
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-4 z-10"
            onClick={onSigmaClick}
            aria-label={
              sigmaEditorFromSession
                ? "Return to concept graph"
                : "Summarize and return to session"
            }
          >
            <Sigma className="size-5" />
          </Button>
        ) : null}
        <div
          className={`absolute right-4 z-10 flex flex-col items-center gap-2 ${
            showOverlaySigma ? "top-14" : "top-3"
          }`}
        >
          <Button
            variant={topAppTarget === "file" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onTopAppTargetChange("file")}
            aria-label="File mode"
            aria-pressed={topAppTarget === "file"}
          >
            <FileText className="size-5" />
          </Button>
          <Button
            variant={topAppTarget === "game" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onTopAppTargetChange("game")}
            aria-label="Game mode"
            aria-pressed={topAppTarget === "game"}
          >
            <Gamepad2 className="size-5" />
          </Button>
        </div>
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start px-6 pb-8 pt-2 overflow-hidden">
            <div
              className={`relative flex w-full flex-1 min-h-0 flex-col justify-start overflow-y-auto transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              {topAppTarget === "game" ? (
                <div
                  className={`mx-auto flex w-full ${layout.mainColumnMaxWidthClass} min-h-0 flex-1 items-start justify-start rounded-xl border border-zinc-800 bg-zinc-950/40 px-6 py-5 text-left`}
                >
                  <p className="text-zinc-300 text-lg">
                    Game content placeholder. Game-related flow UI will live here.
                  </p>
                </div>
              ) : null}

              {topAppTarget === "file" ? (
                <>
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
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
