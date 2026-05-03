import { useEffect } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "convex/react";
import { XIcon } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type PublishedNoteViewerDialogProps = {
  /** Session id of the published note to view, or null to keep the dialog closed. */
  sessionId: Id<"sessions"> | null;
  onClose: () => void;
};

/**
 * Read-only viewer for a single published note. Fetches title + thinkingNotes
 * via `getPublishedNote` (which only resolves for sessions in the published
 * whitelist) and renders the markdown body.
 */
export function PublishedNoteViewerDialog({
  sessionId,
  onClose,
}: PublishedNoteViewerDialogProps) {
  const open = sessionId != null;
  const note = useQuery(
    api.publishedSessions.getPublishedNote,
    sessionId ? { sessionId } : "skip",
  );

  // If the entry vanishes while open (e.g. publisher unpublishes), close the dialog.
  useEffect(() => {
    if (open && note === null) onClose();
  }, [open, note, onClose]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-2xl transition duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-lg font-semibold leading-snug text-foreground">
                {note?.title || "Published note"}
              </DialogPrimitive.Title>
              {note ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  By {note.publisherName}
                  {note.isMine ? " (you)" : ""}
                </p>
              ) : null}
            </div>
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label="Close"
                />
              }
            >
              <XIcon />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/70 bg-muted/10 p-4">
            {note === undefined ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : note === null ? (
              <p className="text-sm text-muted-foreground">
                This note is no longer available.
              </p>
            ) : note.thinkingNotes.trim().length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                The author hasn't written any notes yet.
              </p>
            ) : (
              <div className="prose-published" data-color-mode="dark">
                <MDEditor.Markdown source={note.thinkingNotes} />
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
