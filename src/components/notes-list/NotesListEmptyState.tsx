import { FileText, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotesListEmptyStateProps = {
  onNewFile?: () => void;
  onNewFolder?: () => void;
};

export function NotesListEmptyState({
  onNewFile,
  onNewFolder,
}: NotesListEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-base py-12 px-6 text-center gap-3">
      <div className="rounded-full bg-muted/50 p-4">
        <FileText className="size-8 text-muted-foreground/60" />
      </div>
      <p className="font-medium text-foreground">No files yet</p>
      <p className="text-sm max-w-[280px]">
        Create a file to start thinking, or a folder to group related files.
      </p>
      {onNewFile || onNewFolder ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {onNewFile ? (
            <Button
              variant="secondary"
              className="h-9 gap-2 px-3"
              onClick={onNewFile}
            >
              <Plus className="size-4" />
              New file
            </Button>
          ) : null}
          {onNewFolder ? (
            <Button
              variant="ghost"
              className="h-9 gap-2 px-3 ring-1 ring-border/50"
              onClick={onNewFolder}
            >
              <FolderPlus className="size-4" />
              New folder
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
