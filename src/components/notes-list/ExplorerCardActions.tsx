import { useState, type MouseEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExplorerCardActionsProps = {
  onRename: (e: MouseEvent) => void;
  onDelete: () => void;
  onNewFile?: (e: MouseEvent) => void;
  renameLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteDescription: string;
};

export function ExplorerCardActions({
  onRename,
  onDelete,
  onNewFile,
  renameLabel,
  deleteLabel,
  deleteTitle,
  deleteDescription,
}: ExplorerCardActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        onClick={(e) => {
          e.preventDefault();
          setConfirmOpen(true);
        }}
        aria-label={deleteLabel}
      >
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
