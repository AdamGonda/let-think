import type { RefObject } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmInline } from "./DeleteConfirmInline";

type SidebarSessionItemProps = {
  session: Doc<"sessions">;
  /** Nested sessions under a project are indented. */
  indent?: boolean;
  isGraphActive: boolean;
  viewModeIsNotesList: boolean;
  editingSessionId: Id<"sessions"> | null;
  sessionInputRef: RefObject<HTMLInputElement | null>;
  confirmDeleteSessionId: Id<"sessions"> | null;
  canDeleteSession: boolean;
  onSelect: () => void;
  onBeginEdit: (e: React.MouseEvent) => void;
  onRename: (id: Id<"sessions">, title: string) => void;
  onCancelEdit: () => void;
  onRequestDelete: (e: React.MouseEvent) => void;
  onConfirmDelete: (e: React.MouseEvent) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  onMouseLeaveDeleteConfirm?: () => void;
};

export function SidebarSessionItem({
  session,
  indent = false,
  isGraphActive,
  viewModeIsNotesList,
  editingSessionId,
  sessionInputRef,
  confirmDeleteSessionId,
  canDeleteSession,
  onSelect,
  onBeginEdit,
  onRename,
  onCancelEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onMouseLeaveDeleteConfirm,
}: SidebarSessionItemProps) {
  const isEditing = editingSessionId === session._id;
  const showConfirm = confirmDeleteSessionId === session._id;

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", session._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => {
        if (!isEditing) onSelect();
      }}
      onDoubleClick={onBeginEdit}
      className={`group flex items-center gap-1 py-1.5 px-3 ${
        indent ? "ml-4" : ""
      } rounded-r-lg border-y border-r border-transparent transition-colors cursor-pointer select-none ${
        !viewModeIsNotesList && isGraphActive
          ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
          : "border-l-2 border-l-transparent hover:border-border hover:bg-muted/10 active:bg-muted/20"
      }`}
    >
      {isEditing ? (
        <Input
          ref={sessionInputRef}
          type="text"
          defaultValue={session.title}
          className="flex-1 min-w-0 h-8 py-1 px-2 text-left text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(session._id, (e.target as HTMLInputElement).value);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
          onBlur={(e) => {
            onRename(session._id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className={`flex-1 min-w-0 text-left truncate pointer-events-none text-sm py-0.5 ${
            !viewModeIsNotesList && isGraphActive
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {session.title}
        </div>
      )}
      {showConfirm ? (
        <div onMouseLeave={onMouseLeaveDeleteConfirm}>
          <DeleteConfirmInline
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        </div>
      ) : canDeleteSession ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none hover:bg-destructive/20 hover:text-destructive h-7 shrink-0"
          onClick={onRequestDelete}
          aria-label="Delete session"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
