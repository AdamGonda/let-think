import { layout } from "@/config";
import { FileText, Gamepad2, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBreakCountdown } from "@/lib/formatBreakCountdown";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/NoteBreadcrumb";
import type { Id } from "../../convex/_generated/dataModel";
import type { TopAppTarget } from "@/machines/appUiTypes";
import { SpotifyPanel } from "@/components/spotify/SpotifyPanel";

function SpotifyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm4.56 14.37a.63.63 0 0 1-.87.21c-2.38-1.46-5.37-1.79-8.89-.99a.63.63 0 1 1-.28-1.23c3.85-.88 7.15-.5 9.83 1.14a.63.63 0 0 1 .21.87Zm1.24-2.76a.79.79 0 0 1-1.08.26c-2.73-1.68-6.89-2.17-10.11-1.2a.79.79 0 1 1-.46-1.51c3.67-1.11 8.24-.57 11.4 1.37.37.23.48.71.25 1.08Zm.11-2.87c-3.27-1.94-8.67-2.12-11.79-1.16a.95.95 0 0 1-.56-1.82c3.58-1.09 9.54-.88 13.32 1.36a.95.95 0 1 1-.97 1.62Z"
      />
    </svg>
  );
}

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
  /** True only when the session was opened from the Project notes grid (not the sidebar tree). */
  showFileNoteBreadcrumbFromProjectNotes: boolean;
  notes: string;
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
  breakRemainingMs,
  editorOpen,
  showOverlaySigma,
  workSigmaEditorFromSession,
  onSigmaClick,
  editorRevealReady,
  activeSessionId,
  activeSessionInWorkspace,
  showFileNoteBreadcrumbFromProjectNotes,
  notes,
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
              workSigmaEditorFromSession
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
            variant={topAppTarget === "spotify" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onTopAppTargetChange("spotify")}
            aria-label="Spotify mode"
            aria-pressed={topAppTarget === "spotify"}
          >
            <SpotifyGlyph />
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
        <div className="shrink-0 px-6 pt-4 pb-2 flex flex-col items-center gap-2">
          {breakRemainingMs != null &&
            breakRemainingMs > 0 &&
            !editorOpen && (
              <span className="text-muted-foreground text-lg font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
        </div>
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-stretch justify-start px-6 pb-8 pt-2 overflow-hidden">
            <div
              className={`relative flex w-full flex-1 min-h-0 flex-col justify-start overflow-y-auto transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                className={
                  topAppTarget === "spotify"
                    ? `mx-auto flex w-full ${layout.mainColumnMaxWidthClass} min-h-0 flex-1 flex-col overflow-hidden`
                    : "hidden"
                }
              >
                <SpotifyPanel />
              </div>

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
