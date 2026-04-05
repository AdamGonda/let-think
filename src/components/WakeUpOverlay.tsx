import { layout } from "@/config";
import { Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBreakCountdown } from "@/lib/formatBreakCountdown";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/NoteBreadcrumb";
import type { Id } from "../../convex/_generated/dataModel";

type WakeUpOverlayProps = {
  chatLoading: boolean;
  isExitingOverlay: boolean;
  breakRemainingMs: number | null;
  editorOpen: boolean;
  showOverlaySigma: boolean;
  workSigmaEditorFromSession: boolean;
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
  viewMode: "graph" | "notesList";
  notes: string;
  onNotesChange: (value: string) => void;
  onBreadcrumbProjectClick: () => void;
  onBreadcrumbSessionClick: () => void;
  onBreadcrumbFileClick: () => void;
};

export function WakeUpOverlay({
  chatLoading,
  isExitingOverlay,
  breakRemainingMs,
  editorOpen,
  showOverlaySigma,
  workSigmaEditorFromSession,
  onSigmaClick,
  editorRevealReady,
  activeSessionId,
  activeSessionInWorkspace,
  viewMode,
  notes,
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
        {showOverlaySigma ? (
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-4 z-10"
            onClick={onSigmaClick}
            aria-label={
              workSigmaEditorFromSession
                ? "Return to concept graph"
                : "Summarize and return to session"
            }
          >
            <Sigma className="size-5" />
          </Button>
        ) : null}
        <div className="shrink-0 py-8 flex flex-col items-center gap-1">
          {breakRemainingMs != null &&
            breakRemainingMs > 0 &&
            !editorOpen && (
              <span className="text-muted-foreground text-lg font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
        </div>
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-center px-6 pb-8 overflow-hidden">
            <div
              className={`relative w-full ${layout.mainColumnMaxWidthClass} flex-1 min-h-0 flex flex-col transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              {editorOpen &&
              activeSessionInWorkspace &&
              viewMode === "notesList" ? (
                <NoteBreadcrumb
                  projectName={activeSessionInWorkspace.projectName}
                  sessionName={activeSessionInWorkspace.session.title}
                  onProjectClick={onBreadcrumbProjectClick}
                  onSessionClick={onBreadcrumbSessionClick}
                  onFileClick={onBreadcrumbFileClick}
                />
              ) : null}
              <MarkdownEditor
                value={notes}
                onChange={(v) => onNotesChange(v ?? "")}
                placeholder="Take notes…"
                variant="focused"
                dark={true}
                autoFocus
                autoFocusEnd
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
