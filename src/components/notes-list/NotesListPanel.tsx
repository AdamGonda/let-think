import { useEffect, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  ProjectWithSessions,
  WorkspaceFile,
} from "../session-sidebar/workspaceTypes";
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
  activeFileId: Id<"files"> | null;
  activeProjectId: Id<"projects"> | null;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  onOpenNotesEditor: (file: WorkspaceFile) => void;
  onRunTutorial?: () => void;
}

export function NotesListPanel({
  workspace,
  activeFileId,
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
    drillGroup,
    filteredDrillSessions,
    matchingFiles,
  } = useNotesListModel(workspace, drill, onDrillChange);
  const searchActive = searchQuery.trim().length > 0;

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
    activeFileId,
    activeProjectId,
    onSelectFile: (fileId, sessionId) =>
      intentSelectSessionFromSidebar(actor, sessionId, fileId),
    onSelectProject: (id) => setActiveProject(actor, id),
  });

  const [editingSessionId, setEditingSessionId] =
    useState<Id<"files"> | null>(null);
  const [editingProjectId, setEditingProjectId] =
    useState<Id<"projects"> | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<
    Id<"projects"> | "inbox" | null
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
  const drillHeading = drilled && drillGroup ? drillTitle : "Spaces";

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
            {isEmpty && !searchActive ? (
              <NotesListEmptyState
                onNewFile={createFileInCurrentFolder}
                onNewFolder={createFolder}
              />
            ) : null}

            {searchActive ? (
              matchingFiles.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Nothing matches &quot;{searchQuery.trim()}&quot;
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {matchingFiles.map((file) => (
                    <li key={file._id}>
                      <NotesListSessionCard
                        session={file}
                        isSelected={activeFileId === file._id}
                        isEditing={editingSessionId === file._id}
                        titleInputRef={sessionInputRef}
                        onOpenNotesEditor={onOpenNotesEditor}
                        onRename={(title) => {
                          void handleRenameSession(file._id, title);
                          setEditingSessionId(null);
                        }}
                        onCancelEdit={() => setEditingSessionId(null)}
                        onStartEdit={() => setEditingSessionId(file._id)}
                        onDelete={() => {
                          void handleDeleteSession(file._id);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {!searchActive && !drilled && !isEmpty && (
              <>
                {rootFolders.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    No spaces or files to show.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {rootFolders.map((group) => {
                      const project = group.project;
                      const isInbox = project == null;
                      const cardKey = isInbox ? "inbox" : project._id;
                      const folderHasActiveFile =
                        activeFileId != null &&
                        (group.files ?? []).some((s) => s._id === activeFileId);
                      return (
                        <li key={cardKey}>
                          <ProjectSummaryCard
                            group={group}
                            isSelected={folderHasActiveFile}
                            isDropTarget={
                              isInbox
                                ? dragOverProjectId === "inbox"
                                : dragOverProjectId === project._id
                            }
                            isEditing={
                              !isInbox && editingProjectId === project._id
                            }
                            nameInputRef={projectInputRef}
                            onDrill={() =>
                              onDrillChange(
                                isInbox
                                  ? { type: "inbox" }
                                  : {
                                      type: "project",
                                      id: project._id,
                                    },
                              )
                            }
                            onRename={
                              isInbox
                                ? undefined
                                : (name) => {
                                    void handleRenameProject(project._id, name);
                                    setEditingProjectId(null);
                                  }
                            }
                            onCancelEdit={() => setEditingProjectId(null)}
                            onStartEdit={
                              isInbox
                                ? undefined
                                : () => setEditingProjectId(project._id)
                            }
                            onDelete={
                              isInbox
                                ? undefined
                                : () => {
                                    void handleDeleteProject(project._id);
                                  }
                            }
                            onNewFile={
                              isInbox
                                ? undefined
                                : () => {
                                    void handleNewSession(project._id);
                                  }
                            }
                            onDragOver={() =>
                              setDragOverProjectId(
                                isInbox ? "inbox" : project._id,
                              )
                            }
                            onDragLeave={() => setDragOverProjectId(null)}
                            onDropSession={(fileId) => {
                              void handleMoveSession(
                                fileId,
                                isInbox ? null : project._id,
                              );
                              setDragOverProjectId(null);
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {!searchActive && drilled && drillGroup && (
              <>
                {filteredDrillSessions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {(drillGroup.files ?? []).length === 0
                        ? "No files here yet."
                        : `Nothing matches "${searchQuery}"`}
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredDrillSessions.map((file) => (
                      <li key={file._id}>
                        <NotesListSessionCard
                          session={file}
                          isSelected={activeFileId === file._id}
                          isEditing={editingSessionId === file._id}
                          titleInputRef={sessionInputRef}
                          onOpenNotesEditor={onOpenNotesEditor}
                          onRename={(title) => {
                            void handleRenameSession(file._id, title);
                            setEditingSessionId(null);
                          }}
                          onCancelEdit={() => setEditingSessionId(null)}
                          onStartEdit={() => setEditingSessionId(file._id)}
                          onDelete={() => {
                            void handleDeleteSession(file._id);
                          }}
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
