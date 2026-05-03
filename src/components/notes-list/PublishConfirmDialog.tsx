import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export type PublishConfirmIntent = "publish" | "unpublish";

type PublishConfirmDialogProps = {
  open: boolean;
  intent: PublishConfirmIntent;
  /** Session title shown for context (truncated in UI if very long). */
  sessionTitle: string;
  /** Machine-set error when the Convex invoke fails (shown above actions). */
  error: string | null;
  /** Called when the user dismisses without confirming. */
  onCancel: () => void;
  /** Dispatches `PUBLISH_CONFIRM_SUBMIT` — mutation runs in the machine invoke. */
  onConfirm: () => void;
  /** True while the `publishConfirm` region is in `executing` (Convex invoke in flight). */
  busy: boolean;
};

/**
 * Confirmation before publishing or unpublishing a session’s notes from the Files grid.
 * Open state and busy flag are owned by the app UI machine (`publishConfirm` parallel region).
 */
export function PublishConfirmDialog({
  open,
  intent,
  sessionTitle,
  error,
  onCancel,
  onConfirm,
  busy,
}: PublishConfirmDialogProps) {
  const title =
    intent === "publish" ? "Publish this note?" : "Unpublish this note?";

  const primaryLabel = intent === "publish" ? "Publish" : "Unpublish";

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-[60] flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-2xl transition duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {intent === "publish" ? (
                <>
                  <span className="font-medium text-foreground">
                    {sessionTitle.trim() || "This session"}
                  </span>{" "}
                  will be listed in{" "}
                  <span className="font-medium text-foreground">Discover</span>{" "}
                  for all signed-in users. They can read this session’s{" "}
                  <span className="font-medium text-foreground">title</span> and{" "}
                  <span className="font-medium text-foreground">
                    thinking notes
                  </span>{" "}
                  (what you edit under “To notes”). Your chat and concept graph
                  stay private. If you keep editing your notes, what others see
                  updates until you unpublish or delete the session.
                </>
              ) : (
                <>
                  This note will be removed from{" "}
                  <span className="font-medium text-foreground">Discover</span>.
                  Other people will no longer be able to open it from the feed.
                  Your session, notes, and chat are unchanged on your side.
                </>
              )}
            </DialogPrimitive.Description>
            {error ? (
              <p
                className="mt-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={intent === "publish" ? "default" : "destructive"}
              size="sm"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Please wait…" : primaryLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
