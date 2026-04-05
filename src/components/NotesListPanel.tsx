import type { Doc } from "../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "./session-sidebar/workspaceTypes";
import {
  groupDisplayName,
  formatUpdatedLabel,
  type NotesListDrill,
} from "@/lib/notesListUtils";
import { NotesListToolbar } from "./notes-list/NotesListToolbar";
import { ProjectSummaryCard } from "./notes-list/ProjectSummaryCard";
import { NotesListLoading } from "./notes-list/NotesListLoading";
import { NotesListEmptyState } from "./notes-list/NotesListEmptyState";
import { useNotesListModel } from "@/hooks/useNotesListModel";

export type { NotesListDrill };

interface NotesListPanelProps {
  workspace: ProjectWithSessions[] | undefined;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  onSelectSession: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({
  workspace,
  drill,
  onDrillChange,
  onSelectSession,
}: NotesListPanelProps) {
  const {
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    pinnedIds,
    toggleProjectPinned,
    totalSessions,
    filteredGroups,
    drillGroup,
    filteredDrillSessions,
  } = useNotesListModel(workspace, drill, onDrillChange);

  if (!workspace) {
    return <NotesListLoading />;
  }

  if (totalSessions === 0) {
    return <NotesListEmptyState />;
  }

  const drilled = drill != null;
  const drillTitle = drillGroup ? groupDisplayName(drillGroup) : "";
  const drillHeading =
    drilled && drillGroup ? `${drillTitle}` : "Projects";

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6">
        <NotesListToolbar
          drilled={drilled}
          hasDrillGroup={!!drillGroup}
          drillHeading={drillHeading}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onBackFromDrill={() => {
            onDrillChange(null);
            setSearchQuery("");
          }}
        />

        <div className="min-h-0 flex-1 overflow-y-auto py-6">
          {!drilled && (
            <>
              {filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  {searchQuery.trim() ? (
                    <>Nothing matches &quot;{searchQuery}&quot;</>
                  ) : (
                    <>
                      No projects yet. Sessions without a project stay in{" "}
                      <span className="font-medium text-foreground">Inbox</span>{" "}
                      in the sidebar.
                    </>
                  )}
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredGroups.map((group) => {
                    const projectId = group.project._id;
                    const isPinned = pinnedIds.has(projectId as string);
                    const pinLabelId = `pin-label-${projectId}`;
                    return (
                      <li key={projectId}>
                        <ProjectSummaryCard
                          group={group}
                          isPinned={isPinned}
                          pinLabelId={pinLabelId}
                          onDrill={() =>
                            onDrillChange({
                              type: "project",
                              id: projectId,
                            })
                          }
                          onTogglePin={() =>
                            toggleProjectPinned(projectId as string)
                          }
                        />
                      </li>
                    );
                  })}
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
                      ? "No notes here yet."
                      : `Nothing matches "${searchQuery}"`}
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredDrillSessions.map((session) => (
                    <li key={session._id}>
                      <button
                        type="button"
                        onClick={() => onSelectSession(session)}
                        className="flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-xl border-4 border-border border-dashed bg-card p-5 text-left shadow-sm transition-colors hover:border-border hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="font-semibold text-foreground leading-snug line-clamp-2">
                          {session.title}
                        </span>
                        <p className="text-xs text-muted-foreground/90 pt-1">
                          {formatUpdatedLabel(session.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
