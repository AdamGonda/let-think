import type { Doc } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
import { groupDisplayName, type NotesListDrill } from "@/lib/notesListUtils";
import { NotesListToolbar } from "./NotesListToolbar";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { NotesListLoading } from "./NotesListLoading";
import { NotesListEmptyState } from "./NotesListEmptyState";
import { NotesListSessionCard } from "./NotesListSessionCard";
import { useNotesListModel } from "@/hooks/useNotesListModel";

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
                    return (
                      <li key={projectId}>
                        <ProjectSummaryCard
                          group={group}
                          onDrill={() =>
                            onDrillChange({
                              type: "project",
                              id: projectId,
                            })
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
                      <NotesListSessionCard
                        session={session}
                        onSelect={onSelectSession}
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
  );
}
