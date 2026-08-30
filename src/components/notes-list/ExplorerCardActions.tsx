import type { MouseEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmInline } from "@/components/session-sidebar/DeleteConfirmInline";

type ExplorerCardActionsProps = {
  confirmDelete: boolean;
  onRename: (e: MouseEvent) => void;
  onDelete: (e: MouseEvent) => void;
  onConfirmDelete: (e: MouseEvent) => void;
  onCancelDelete: (e: MouseEvent) => void;
  onNewFile?: (e: MouseEvent) => void;
  renameLabel: string;
  deleteLabel: string;
};

export function ExplorerCardActions({
  confirmDelete,
  onRename,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onNewFile,
  renameLabel,
  deleteLabel,
}: ExplorerCardActionsProps) {
  if (confirmDelete) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <DeleteConfirmInline
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {onNewFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-7 w-7"
          onClick={onNewFile}
          aria-label="New file in folder"
        >
          <Plus className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="h-7 w-7"
        onClick={onRename}
        aria-label={renameLabel}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
        onClick={onDelete}
        aria-label={deleteLabel}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
