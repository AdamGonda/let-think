import { useCallback } from "react";
import { layout } from "@/config";
import { Brain, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { NoteBreadcrumb } from "@/components/navigation/NoteBreadcrumb";
import { NotesChatPanel } from "@/components/notes-chat/NotesChatPanel";
import type { NotesChatMessage } from "@/hooks/useNotesChat";
import type { Id } from "../../../convex/_generated/dataModel";

type WakeUpOverlayProps = {
  chatLoading: boolean;
  notesChatLoading: boolean;
  isExitingOverlay: boolean;
  editorOpen: boolean;
  editorChatOpen: boolean;
  onEditorChatToggle: () => void;
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
  notesChatMessages: NotesChatMessage[];
  notesChatMessagesLoading: boolean;
  onNotesChatSend: (content: string) => Promise<void>;
};

export function WakeUpOverlay({
  chatLoading,
  notesChatLoading,
  isExitingOverlay,
  editorOpen,
  editorChatOpen,
  onEditorChatToggle,
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
  notesChatMessages,
  notesChatMessagesLoading,
  onNotesChatSend,
}: WakeUpOverlayProps) {
  const showFileNavBreadcrumb =
    editorOpen && !!activeSessionInWorkspace;
  /** Visible whenever the note overlay is active (breadcrumb loading state is separate). */
  const showHeaderActions = editorOpen && !!activeSessionId;
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
      aria-busy={chatLoading || notesChatLoading}
      aria-live="polite"
    >
      <div
        className={`flex flex-1 min-h-0 flex-col transition-opacity duration-75 ${
          isExitingOverlay ? "opacity-0" : "opacity-100"
        }`}
      >
        {showHeaderActions ? (
          <div className="absolute top-3 right-4 z-20 flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onEditorChatToggle}
              aria-pressed={editorChatOpen}
              aria-label={
                editorChatOpen
                  ? "Hide chat about this note"
                  : "Show chat about this note"
              }
              title={
                editorChatOpen
                  ? "Hide chat about this note"
                  : "Show chat about this note"
              }
            >
              <MessageSquare className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onOverlayActionClick}
              aria-label={
                overlayActionReturnsToGraph
                  ? "Return to concept graph"
                  : "Summarize and return to session"
              }
            >
              <Brain className="size-5" />
            </Button>
          </div>
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
              className={`relative flex min-h-0 w-full flex-1 flex-col justify-start overflow-hidden transition-opacity duration-150 ${
                editorRevealReady ? "opacity-100" : "opacity-0"
              }`}
            >
              {editorChatOpen ? (
                <div className="flex min-h-0 w-full flex-1 gap-0 overflow-hidden">
                  <div className="flex min-h-0 min-w-0 flex-[3] flex-col justify-start overflow-y-auto">
                    <div className="mx-auto flex h-full w-full min-h-0 flex-1 flex-col justify-start px-2">
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
                  <div className="flex min-h-0 min-w-0 flex-[2] flex-col border-l border-border">
                    <NotesChatPanel
                      sessionId={activeSessionId}
                      messages={notesChatMessages}
                      messagesLoading={notesChatMessagesLoading}
                      isLoading={notesChatLoading}
                      onSend={onNotesChatSend}
                    />
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
