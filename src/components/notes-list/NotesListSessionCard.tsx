import type { RefObject } from "react";
import { clsx } from "clsx";
import type { WorkspaceFile } from "@/components/session-sidebar/workspaceTypes";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import { Input } from "@/components/ui/input";
import { ExplorerCardActions } from "./ExplorerCardActions";

type NotesListSessionCardProps = {
  session: WorkspaceFile;
  isSelected: boolean;
  isMapHighlighted?: boolean;
  isEditing?: boolean;
  confirmDelete?: boolean;
  titleInputRef?: RefObject<HTMLInputElement | null>;
  onOpenNotesEditor: (session: WorkspaceFile) => void;
  onRename?: (title: string) => void;
  onCancelEdit?: () => void;
  onStartEdit?: () => void;
  onRequestDelete?: () => void;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
};

export function NotesListSessionCard({
  session,
  isSelected,
  isMapHighlighted = false,
  isEditing = false,
  confirmDelete = false,
  titleInputRef,
  onOpenNotesEditor,
  onRename,
  onCancelEdit,
  onStartEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: NotesListSessionCardProps) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2 transition-[border-color,background-color] duration-150",
        isSelected ? "border-sidebar-primary" : "border-border/90",
        isMapHighlighted && "bg-muted/45",
      )}
      draggable={!isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", session._id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <CornerRippleBackdrop />
      {isEditing ? (
        <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5">
          <Input
            ref={titleInputRef}
            type="text"
            defaultValue={session.title}
            className="h-9 text-base font-semibold"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename?.((e.target as HTMLInputElement).value);
              } else if (e.key === "Escape") {
                onCancelEdit?.();
              }
            }}
            onBlur={(e) => onRename?.(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <button
          type="button"
          aria-current={isSelected ? "true" : undefined}
          onClick={() => onOpenNotesEditor(session)}
          onDoubleClick={(e) => {
            if (!onStartEdit) return;
            e.preventDefault();
            e.stopPropagation();
            onStartEdit();
          }}
          className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 font-semibold text-foreground leading-snug line-clamp-2">
              {session.title}
            </span>
            {onStartEdit && onRequestDelete ? (
              <ExplorerCardActions
                confirmDelete={confirmDelete}
                onRename={(e) => {
                  e.preventDefault();
                  onStartEdit();
                }}
                onDelete={(e) => {
                  e.preventDefault();
                  onRequestDelete();
                }}
                onConfirmDelete={(e) => {
                  e.preventDefault();
                  onConfirmDelete?.();
                }}
                onCancelDelete={(e) => {
                  e.preventDefault();
                  onCancelDelete?.();
                }}
                renameLabel="Rename file"
                deleteLabel="Delete file"
              />
            ) : null}
          </div>
          <span
            className={clsx(
              "mt-auto inline-flex h-7 w-fit items-center px-2 text-sm font-normal text-muted-foreground/90",
              "opacity-0 transition-opacity duration-200 ease-out",
              "group-hover:opacity-100 group-focus-within:opacity-100",
              "[@media(hover:none)]:opacity-100",
            )}
          >
            Open
          </span>
        </button>
      )}
    </div>
  );
}
