import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
import { groupDisplayName, type NotesListDrill } from "@/lib/notesListUtils";
import type { NotesListMode } from "@/machines/appUiTypes";
import { NotesListToolbar } from "./NotesListToolbar";
import { NotesListModeSwitcher } from "./NotesListModeSwitcher";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { NotesListLoading } from "./NotesListLoading";
import { NotesListEmptyState } from "./NotesListEmptyState";
import { NotesListSessionCard } from "./NotesListSessionCard";
import { DiscoverGrid } from "./DiscoverGrid";
import { useNotesListModel } from "@/hooks/useNotesListModel";

interface NotesListPanelProps {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  drill: NotesListDrill;
  onDrillChange: (drill: NotesListDrill) => void;
  mode: NotesListMode;
  onModeChange: (mode: NotesListMode) => void;
  onOpenPublishedNoteViewer: (sessionId: Id<"sessions">) => void;
  onOpenNotesEditor: (session: Doc<"sessions">) => void;
  onOpenSessionGraph: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({
  workspace,
  activeSessionId,
  drill,
  onDrillChange,
  mode,
  onModeChange,
  onOpenPublishedNoteViewer,
  onOpenNotesEditor,
  onOpenSessionGraph,
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

  if (mode === "discover") {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-background">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6">
          <div className="shrink-0 flex items-center justify-between gap-4 border-b border-border py-6">
            <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground truncate">
              Discover
            </h1>
            <NotesListModeSwitcher mode={mode} onModeChange={onModeChange} />
          </div>
          <DiscoverGrid onOpenPublishedNote={onOpenPublishedNoteViewer} />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return <NotesListLoading />;
  }

  if (totalSessions === 0) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-background">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6">
          <div className="shrink-0 flex items-center justify-end gap-4 py-6">
            <NotesListModeSwitcher mode={mode} onModeChange={onModeChange} />
          </div>
          <NotesListEmptyState />
        </div>
      </div>
    );
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
          modeSwitcher={
            !drilled ? (
              <NotesListModeSwitcher mode={mode} onModeChange={onModeChange} />
            ) : null
          }
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
                      No folders to show. Sessions without a project live in{" "}
                      <span className="font-medium text-foreground">Inbox</span>.
                    </>
                  )}
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  );
}
