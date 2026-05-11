import type { Doc, Id } from "../../../convex/_generated/dataModel";
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
  activeSessionId: Id<"sessions"> | null;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
  onOpenSessionGraph: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({
  workspace,
  activeSessionId,
  drill,
  onDrillChange,
  onOpenNotesEditor,
  onOpenSessionGraph,
}: NotesListPanelProps) {
  const {
    searchQuery,
    setSearchQuery,
    totalSessions,
    filteredGroups,
    drillGroup,
    filteredDrillSessions,
  } = useNotesListModel(workspace, drill, onDrillChange);

  const drilled = drill != null;
  const drillTitle = drillGroup ? groupDisplayName(drillGroup) : "";
  const drillHeading =
    drilled && drillGroup ? `${drillTitle}` : "Projects";

  if (!workspace) {
    return <NotesListLoading />;
  }

  if (totalSessions === 0) {
    return <NotesListEmptyState />;
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
          />

          <div className="min-h-0 flex-1 overflow-y-auto pb-8">
            {!drilled && (
              <>
                {filteredGroups.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    {searchQuery.trim() ? (
                      <>Nothing matches &quot;{searchQuery}&quot;</>
                    ) : (
                      <>
                        No folders to show. Sessions without a project live in{" "}
                        <span className="font-medium text-foreground">Inbox</span>.
                      </>
                    )}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredGroups.map((group) => {
                      const project = group.project;
                      const isInbox = project == null;
                      const cardKey = isInbox ? "inbox" : project._id;
                      const folderHasActiveSession =
                        activeSessionId != null &&
                        group.sessions.some((s) => s._id === activeSessionId);
                      return (
                        <li key={cardKey}>
                          <ProjectSummaryCard
                            group={group}
                            isSelected={folderHasActiveSession}
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
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredDrillSessions.map((session) => (
                      <li key={session._id}>
                        <NotesListSessionCard
                          session={session}
                          isSelected={activeSessionId === session._id}
                          onOpenNotesEditor={onOpenNotesEditor}
                          onOpenSessionGraph={onOpenSessionGraph}
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
