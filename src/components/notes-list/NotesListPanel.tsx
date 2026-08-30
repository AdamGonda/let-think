import { useEffect, useRef, useState } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
import { groupDisplayName, type NotesListDrill } from "@/lib/notesListUtils";
import { NotesListToolbar } from "./NotesListToolbar";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { NotesListLoading } from "./NotesListLoading";
import { NotesListEmptyState } from "./NotesListEmptyState";
import { NotesListSessionCard } from "./NotesListSessionCard";
import { useNotesListModel } from "@/hooks/useNotesListModel";
import { useWorkspaceActions } from "@/hooks/useWorkspaceActions";
import { useAppUiActor } from "@/hooks/useAppUi";
import {
  intentSelectSessionFromSidebar,
  setActiveProject,
} from "@/lib/appUiCommands";

interface NotesListPanelProps {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  activeProjectId: Id<"projects"> | null;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
  onRunTutorial?: () => void;
}

export function NotesListPanel({
  workspace,
  activeSessionId,
  activeProjectId,
  drill,
  onDrillChange,
  onOpenNotesEditor,
  onRunTutorial,
}: NotesListPanelProps) {
  const actor = useAppUiActor();
  const {
    searchQuery,
    setSearchQuery,
    isEmpty,
    rootFolders,
    rootFiles,
    drillGroup,
    filteredDrillSessions,
  } = useNotesListModel(workspace, drill, onDrillChange);

  const {
    handleNewSession,
    handleNewProject,
    handleRenameSession,
    handleRenameProject,
    handleDeleteSession,
    handleMoveSession,
    handleDeleteProject,
  } = useWorkspaceActions({
    workspace,
    activeSessionId,
    activeProjectId,
    onSelectSession: (id) => intentSelectSessionFromSidebar(actor, id),
    onSelectProject: (id) => setActiveProject(actor, id),
  });

  const [editingSessionId, setEditingSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [editingProjectId, setEditingProjectId] =
    useState<Id<"projects"> | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] =
    useState<Id<"projects"> | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<
    Id<"projects"> | null
  >(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSessionId) {
      sessionInputRef.current?.focus();
      sessionInputRef.current?.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    if (editingProjectId) {
      projectInputRef.current?.focus();
      projectInputRef.current?.select();
    }
  }, [editingProjectId]);

  const drilled = drill != null;
  const drillTitle = drillGroup ? groupDisplayName(drillGroup) : "";
  const drillHeading = drilled && drillGroup ? drillTitle : "Files";

  const createFileInCurrentFolder = () => {
    const projectId =
      drill?.type === "project" ? drill.id : undefined;
    void handleNewSession(projectId);
  };

  const createFolder = () => {
    void handleNewProject().then((id) => {
      setEditingProjectId(id);
    });
  };

  if (!workspace) {
    return <NotesListLoading />;
  }

  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col">
          <NotesListToolbar
            className="py-0 pb-6"
            drilled={drilled}
            hasDrillGroup={!!drillGroup}
            drillHeading={drillHeading}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onBackFromDrill={() => {
              onDrillChange(null);
              setSearchQuery("");
            }}
            onNewFile={createFileInCurrentFolder}
            onNewFolder={createFolder}
            onRunTutorial={onRunTutorial}
          />

          <div className="min-h-0 flex-1 overflow-y-auto pb-8">
            {isEmpty ? (
              <NotesListEmptyState
                onNewFile={createFileInCurrentFolder}
                onNewFolder={createFolder}
              />
            ) : null}

            {!drilled && !isEmpty && (
              <>
                {rootFolders.length === 0 && rootFiles.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    {searchQuery.trim() ? (
                      <>Nothing matches &quot;{searchQuery}&quot;</>
                    ) : (
                      <>No folders or files to show.</>
                    )}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {rootFolders.map((group) => {
                      const project = group.project;
                      const folderHasActiveSession =
                        activeSessionId != null &&
                        group.sessions.some((s) => s._id === activeSessionId);
                      return (
                        <li key={project._id}>
                          <ProjectSummaryCard
                            group={group}
                            isSelected={folderHasActiveSession}
                            isDropTarget={dragOverProjectId === project._id}
                            isEditing={editingProjectId === project._id}
                            confirmDelete={
                              confirmDeleteProjectId === project._id
                            }
                            nameInputRef={projectInputRef}
                            onDrill={() =>
                              onDrillChange({
                                type: "project",
                                id: project._id,
                              })
                            }
                            onRename={(name) => {
                              void handleRenameProject(project._id, name);
                              setEditingProjectId(null);
                            }}
                            onCancelEdit={() => setEditingProjectId(null)}
                            onStartEdit={() => setEditingProjectId(project._id)}
                            onRequestDelete={() =>
                              setConfirmDeleteProjectId(project._id)
                            }
                            onConfirmDelete={() => {
                              void handleDeleteProject(project._id);
                              setConfirmDeleteProjectId(null);
                            }}
                            onCancelDelete={() =>
                              setConfirmDeleteProjectId(null)
                            }
                            onNewFile={() => {
                              void handleNewSession(project._id);
                            }}
                            onDragOver={() =>
                              setDragOverProjectId(project._id)
                            }
                            onDragLeave={() => setDragOverProjectId(null)}
                            onDropSession={(sessionId) => {
                              void handleMoveSession(sessionId, project._id);
                              setDragOverProjectId(null);
                            }}
                          />
                        </li>
                      );
                    })}
                    {rootFiles.map((session) => (
                      <li key={session._id}>
                        <NotesListSessionCard
                          session={session}
                          isSelected={activeSessionId === session._id}
                          isEditing={editingSessionId === session._id}
                          confirmDelete={
                            confirmDeleteSessionId === session._id
                          }
                          titleInputRef={sessionInputRef}
                          onOpenNotesEditor={onOpenNotesEditor}
                          onRename={(title) => {
                            void handleRenameSession(session._id, title);
                            setEditingSessionId(null);
                          }}
                          onCancelEdit={() => setEditingSessionId(null)}
                          onStartEdit={() => setEditingSessionId(session._id)}
                          onRequestDelete={() =>
                            setConfirmDeleteSessionId(session._id)
                          }
                          onConfirmDelete={() => {
                            void handleDeleteSession(session._id);
                            setConfirmDeleteSessionId(null);
                          }}
                          onCancelDelete={() =>
                            setConfirmDeleteSessionId(null)
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {drilled && drillGroup && (
              <>
                {filteredDrillSessions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {drillGroup.sessions.length === 0
                        ? "No files here yet."
                        : `Nothing matches "${searchQuery}"`}
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredDrillSessions.map((session) => (
                      <li key={session._id}>
                        <NotesListSessionCard
                          session={session}
                          isSelected={activeSessionId === session._id}
                          isEditing={editingSessionId === session._id}
                          confirmDelete={
                            confirmDeleteSessionId === session._id
                          }
                          titleInputRef={sessionInputRef}
                          onOpenNotesEditor={onOpenNotesEditor}
                          onRename={(title) => {
                            void handleRenameSession(session._id, title);
                            setEditingSessionId(null);
                          }}
                          onCancelEdit={() => setEditingSessionId(null)}
                          onStartEdit={() => setEditingSessionId(session._id)}
                          onRequestDelete={() =>
                            setConfirmDeleteSessionId(session._id)
                          }
                          onConfirmDelete={() => {
                            void handleDeleteSession(session._id);
                            setConfirmDeleteSessionId(null);
                          }}
                          onCancelDelete={() =>
                            setConfirmDeleteSessionId(null)
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
