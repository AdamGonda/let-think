import type { RefObject } from "react";
import { clsx } from "clsx";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import { Input } from "@/components/ui/input";
import { groupDisplayName } from "@/lib/notesListUtils";
import { ExplorerCardActions } from "./ExplorerCardActions";

type ProjectSummaryCardProps = {
  group: ProjectWithSessions;
  isSelected: boolean;
  isMapHighlighted?: boolean;
  isDropTarget?: boolean;
  isEditing?: boolean;
  confirmDelete?: boolean;
  nameInputRef?: RefObject<HTMLInputElement | null>;
  onDrill: () => void;
  onRename?: (name: string) => void;
  onCancelEdit?: () => void;
  onStartEdit?: () => void;
  onRequestDelete?: () => void;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  onNewFile?: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDropSession?: (sessionId: Id<"sessions">) => void;
};

export function ProjectSummaryCard({
  group,
  isSelected,
  isMapHighlighted = false,
  isDropTarget = false,
  isEditing = false,
  confirmDelete = false,
  nameInputRef,
  onDrill,
  onRename,
  onCancelEdit,
  onStartEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onNewFile,
  onDragOver,
  onDragLeave,
  onDropSession,
}: ProjectSummaryCardProps) {
  const title = groupDisplayName(group);
  const sessions = group.sessions;
  const count = sessions.length;
  const fileCountLabel =
    count === 0
      ? "No files yet"
      : count === 1
        ? "1 file"
        : `${count} files`;
  const isInbox = group.project == null;
  const canManage = !isInbox && !!group.project;

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-xl border-2 transition-[border-color,background-color] duration-150",
        isSelected ? "border-sidebar-primary" : "border-border/90",
        isMapHighlighted && "bg-muted/45",
        isDropTarget && "ring-2 ring-ring ring-inset bg-muted/30",
      )}
      onDragOver={
        onDragOver
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              onDragOver();
            }
          : undefined
      }
      onDragLeave={onDragLeave}
      onDrop={
        onDropSession
          ? (e) => {
              e.preventDefault();
              const sessionId = e.dataTransfer.getData(
                "text/plain",
              ) as Id<"sessions">;
              if (sessionId) onDropSession(sessionId);
            }
          : undefined
      }
    >
      <CornerRippleBackdrop />
      {isEditing && canManage && group.project ? (
        <div className="relative z-10 flex min-h-30 w-full flex-col gap-2 p-5">
          <Input
            ref={nameInputRef}
            type="text"
            defaultValue={group.project.name}
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
          <p className="mt-auto pt-1 text-sm text-muted-foreground/90">
            {fileCountLabel}
          </p>
        </div>
      ) : (
        <button
          type="button"
          aria-current={isSelected ? "true" : undefined}
          onClick={onDrill}
          onDoubleClick={(e) => {
            if (!canManage || !onStartEdit) return;
            e.preventDefault();
            e.stopPropagation();
            onStartEdit();
          }}
          className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-base font-semibold leading-[1.25] text-foreground line-clamp-2">
              {title}
            </span>
            {canManage && onStartEdit && onRequestDelete ? (
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
                onNewFile={
                  onNewFile
                    ? (e) => {
                        e.preventDefault();
                        onNewFile();
                      }
                    : undefined
                }
                renameLabel="Rename folder"
                deleteLabel="Delete folder"
              />
            ) : null}
          </div>
          <p className="mt-auto pt-1 text-sm text-muted-foreground/90">
            {fileCountLabel}
          </p>
        </button>
      )}
    </div>
  );
}
