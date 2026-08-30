import { FileText } from "lucide-react";

export function NotesListEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-base py-12 px-6 text-center gap-3">
      <div className="rounded-full bg-muted/50 p-4">
        <FileText className="size-8 text-muted-foreground/60" />
      </div>
      <p className="font-medium text-foreground">No files yet</p>
      <p className="text-sm max-w-[280px]">
        Create a file in the sidebar to start collecting thinking notes under a
        project or in your inbox
      </p>
    </div>
  );
}
