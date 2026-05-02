import type { RefObject } from "react";
import { timings } from "@/config";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  ChevronDown,
  Circle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmInline } from "./DeleteConfirmInline";
import type { ProjectWithSessions } from "./workspaceTypes";
import { SidebarSessionItem } from "./SidebarSessionItem";

type SidebarProjectGroupProps = {
  group: ProjectWithSessions;
  isExpanded: boolean;
  activeProjectId: Id<"projects"> | null;
  activeSessionId: Id<"sessions"> | null;
  dragOverProjectId: string | "inbox" | null;
  editingProjectId: Id<"projects"> | null;
  editingSessionId: Id<"sessions"> | null;
  projectInputRef: RefObject<HTMLInputElement | null>;
  sessionInputRef: RefObject<HTMLInputElement | null>;
  confirmDeleteProjectId: Id<"projects"> | null;
  confirmDeleteSessionId: Id<"sessions"> | null;
  projectClickTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>;
  onDragOverProject: (projectId: Id<"projects">) => void;
  onDragLeaveProject: () => void;
  onDropOnProject: (projectId: Id<"projects">, e: React.DragEvent) => void;
  onRenameProject: (id: Id<"projects">, name: string) => void;
  onCancelEditProject: () => void;
  onToggleProjectExpanded: (projectId: string) => void;
  onStartEditProject: (id: Id<"projects">) => void;
  onNewSessionInProject: (e: React.MouseEvent, projectId: Id<"projects">) => void;
  onRequestDeleteProject: (e: React.MouseEvent, id: Id<"projects">) => void;
  onConfirmDeleteProject: (e: React.MouseEvent, id: Id<"projects">) => void;
  onCancelDeleteProject: (e: React.MouseEvent) => void;
  onMouseLeaveDeleteProjectConfirm: () => void;
  onSelectSession: (id: Id<"sessions">) => void;
  onSelectProject: (id: Id<"projects"> | null) => void;
  onRenameSession: (id: Id<"sessions">, title: string) => void;
  onCancelEditSession: () => void;
  onSetEditingSessionId: (id: Id<"sessions"> | null) => void;
  onSetConfirmDeleteSessionId: (id: Id<"sessions"> | null) => void;
  onRequestDeleteSession: (e: React.MouseEvent, id: Id<"sessions">) => void;
  onCancelDeleteSession: (e: React.MouseEvent) => void;
  onDeleteSession: (id: Id<"sessions">) => void;
};

export function SidebarProjectGroup({
  group,
  isExpanded,
  activeProjectId,
  activeSessionId,
  dragOverProjectId,
  editingProjectId,
  editingSessionId,
  projectInputRef,
  sessionInputRef,
  confirmDeleteProjectId,
  confirmDeleteSessionId,
  projectClickTimeoutRef,
  onDragOverProject,
  onDragLeaveProject,
  onDropOnProject,
  onRenameProject,
  onCancelEditProject,
  onToggleProjectExpanded,
  onStartEditProject,
  onNewSessionInProject,
  onRequestDeleteProject,
  onConfirmDeleteProject,
  onCancelDeleteProject,
  onMouseLeaveDeleteProjectConfirm,
  onSelectSession,
  onSelectProject,
  onRenameSession,
  onCancelEditSession,
  onSetEditingSessionId,
  onSetConfirmDeleteSessionId,
  onRequestDeleteSession,
  onCancelDeleteSession,
  onDeleteSession,
}: SidebarProjectGroupProps) {
  const project = group.project!;
  const sessions = group.sessions;
  const projectId = project._id;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center gap-1 group/project rounded-lg transition-colors px-3 pl-0 ${
          activeProjectId === projectId
            ? "border-l-2 border-l-sidebar-primary bg-sidebar-accent/40"
            : "hover:bg-muted/10 active:bg-muted/20"
        } ${
          dragOverProjectId === project._id ? "ring-2 ring-ring ring-inset" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOverProject(project._id);
        }}
        onDragLeave={onDragLeaveProject}
        onDrop={(e) => onDropOnProject(project._id, e)}
      >
        {editingProjectId === project._id ? (
          <Input
            ref={projectInputRef}
            type="text"
            defaultValue={project.name}
            className="flex-1 min-w-0 h-8 py-1 px-2 text-left text-sm font-medium"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRenameProject(
                  project._id,
                  (e.target as HTMLInputElement).value,
                );
              } else if (e.key === "Escape") {
                onCancelEditProject();
              }
            }}
            onBlur={(e) => {
              onRenameProject(project._id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (projectClickTimeoutRef.current) {
                clearTimeout(projectClickTimeoutRef.current);
                projectClickTimeoutRef.current = null;
                return;
              }
              projectClickTimeoutRef.current = setTimeout(() => {
                projectClickTimeoutRef.current = null;
                onToggleProjectExpanded(projectId);
              }, timings.projectRowClickDelayMs);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (projectClickTimeoutRef.current) {
                clearTimeout(projectClickTimeoutRef.current);
                projectClickTimeoutRef.current = null;
              }
              onStartEditProject(project._id);
            }}
            aria-expanded={isExpanded}
            aria-label={`${project.name}, click to ${isExpanded ? "collapse" : "expand"}`}
            className="flex-1 min-w-0 flex items-center gap-1 py-2.5 pr-2 pl-1.5 text-left rounded-lg font-medium text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            <span
              className={`shrink-0 flex items-center justify-center w-6 ${
                sessions.length === 0
                  ? "text-sidebar-primary"
                  : "text-muted-foreground"
              }`}
            >
              {sessions.length === 0 ? (
                <Circle className="size-1.5 fill-current" strokeWidth={0} />
              ) : (
                <ChevronDown
                  className={`size-4 transition-transform ${
                    isExpanded ? "" : "-rotate-90"
                  }`}
                />
              )}
            </span>
            <span className="flex-1 min-w-0 truncate">{project.name}</span>
          </button>
        )}
        {confirmDeleteProjectId !== project._id && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover/project:opacity-100 group-hover/project:pointer-events-auto pointer-events-none h-7 shrink-0"
            onClick={(e) => onNewSessionInProject(e, project._id)}
            aria-label="New session in project"
          >
            <Plus className="size-4" />
          </Button>
        )}
        {confirmDeleteProjectId === project._id ? (
          <div onMouseLeave={onMouseLeaveDeleteProjectConfirm}>
            <DeleteConfirmInline
              onConfirm={(e) => onConfirmDeleteProject(e, project._id)}
              onCancel={(e) => onCancelDeleteProject(e)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover/project:opacity-100 group-hover/project:pointer-events-auto pointer-events-none hover:bg-destructive/20 hover:text-destructive h-7 shrink-0"
            onClick={(e) => onRequestDeleteProject(e, project._id)}
            aria-label="Delete project"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {isExpanded &&
        sessions.map((session: Doc<"sessions">) => (
          <SidebarSessionItem
            key={session._id}
            session={session}
            indent
            isActive={activeSessionId === session._id}
            editingSessionId={editingSessionId}
            sessionInputRef={sessionInputRef}
            confirmDeleteSessionId={confirmDeleteSessionId}
            onSelect={() => {
              if (editingSessionId !== session._id) {
                onSelectSession(session._id);
                if (session.projectId) onSelectProject(session.projectId);
              }
            }}
            onBeginEdit={(e) => {
              if (editingSessionId !== session._id) {
                e.stopPropagation();
                onSetEditingSessionId(session._id);
              }
            }}
            onRename={onRenameSession}
            onCancelEdit={onCancelEditSession}
            onRequestDelete={(e) => {
              e.stopPropagation();
              onRequestDeleteSession(e, session._id);
            }}
            onConfirmDelete={(e) => {
              e.stopPropagation();
              onDeleteSession(session._id);
            }}
            onCancelDelete={(e) => {
              e.stopPropagation();
              onCancelDeleteSession(e);
            }}
            onMouseLeaveDeleteConfirm={() =>
              onSetConfirmDeleteSessionId(null)
            }
          />
        ))}
    </div>
  );
}
