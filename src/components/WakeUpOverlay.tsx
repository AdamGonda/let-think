import { layout } from "@/config";
import { FileText, Gamepad2, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBreakCountdown } from "@/lib/formatBreakCountdown";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/NoteBreadcrumb";
import type { Id } from "../../convex/_generated/dataModel";
import type { TopAppTarget } from "@/machines/appUiTypes";

function SpotifyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
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
  viewMode: "graph" | "notesList";
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
  viewMode,
  notes,
  onNotesChange,
  onBreadcrumbProjectClick,
  onBreadcrumbSessionClick,
  onBreadcrumbFileClick,
  topAppTarget,
  onTopAppTargetChange,
}: WakeUpOverlayProps) {
  const renderTopTargetContent = () => {
    if (topAppTarget === "spotify") {
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-6 text-center">
          <p className="text-zinc-300 text-lg">
            Spotify content placeholder. Music-focused flow UI will live here.
          </p>
        </div>
      );
    }

    if (topAppTarget === "game") {
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-6 text-center">
          <p className="text-zinc-300 text-lg">
            Game content placeholder. Game-related flow UI will live here.
          </p>
        </div>
      );
    }

    return (
      <>
        {editorOpen && activeSessionInWorkspace && viewMode === "notesList" ? (
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
      </>
    );
  };

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
        <div className="shrink-0 py-8 flex flex-col items-center gap-3">
          {breakRemainingMs != null &&
            breakRemainingMs > 0 &&
            !editorOpen && (
              <span className="text-muted-foreground text-lg font-medium tabular-nums">
                {formatBreakCountdown(breakRemainingMs)}
              </span>
            )}
          <div className="flex items-center gap-2">
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
              <Gamepad2 className="size-4" />
            </Button>
            <Button
              variant={topAppTarget === "file" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onTopAppTargetChange("file")}
              aria-label="File mode"
              aria-pressed={topAppTarget === "file"}
            >
              <FileText className="size-4" />
            </Button>
          </div>
        </div>
        {activeSessionId && (
          <div className="flex-1 min-h-0 flex flex-col items-center px-6 pb-8 overflow-hidden">
            <div
              className={`relative w-full ${layout.mainColumnMaxWidthClass} flex-1 min-h-0 flex flex-col transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              {renderTopTargetContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
