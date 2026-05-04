import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { ProjectWithSessions } from "../session-sidebar/workspaceTypes";
import { groupDisplayName, type NotesListDrill } from "@/lib/notesListUtils";
import { NotesListToolbar } from "./NotesListToolbar";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { NotesListLoading } from "./NotesListLoading";
import { NotesListEmptyState } from "./NotesListEmptyState";
import { NotesListSessionCard } from "./NotesListSessionCard";
import { useNotesListModel } from "@/hooks/useNotesListModel";
import { SessionCentroidScatterChart } from "@/components/session-centroid/SessionCentroidScatterChart";
import { useSessionCentroidMapData } from "@/hooks/useSessionCentroidMapData";
import { useMemo, useState } from "react";

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

  const scopedSessions = useMemo(() => {
    if (drilled && drillGroup) return drillGroup.sessions;
    return workspace.flatMap((group) => group.sessions);
  }, [drilled, drillGroup, workspace]);
  const scopedSessionIds = useMemo(
    () => scopedSessions.map((session) => session._id),
    [scopedSessions]
  );
  const { points, isLoading, error } = useSessionCentroidMapData({
    projectId:
      drill && drill.type === "project" ? drill.id : undefined,
    sessionIds: scopedSessionIds,
  });
  const [mapHoveredSessionId, setMapHoveredSessionId] = useState<
    Id<"sessions"> | null
  >(null);

  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start lg:gap-x-10">
          <div className="flex min-h-0 min-w-0 flex-col">
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
                      const folderMatchesMapHover =
                        mapHoveredSessionId != null &&
                        group.sessions.some(
                          (s) => s._id === mapHoveredSessionId,
                        );
                      return (
                        <li key={cardKey}>
                          <ProjectSummaryCard
                            group={group}
                            isSelected={folderHasActiveSession}
                            isMapHighlighted={folderMatchesMapHover}
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
                          isMapHighlighted={mapHoveredSessionId === session._id}
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

          <aside className="flex w-full min-w-0 flex-col lg:sticky lg:top-6 lg:self-start">
            <div className="mb-5 flex min-h-10 items-center">
              <p className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Session Map
              </p>
            </div>
            <div className="w-full min-w-0">
              <SessionCentroidScatterChart
                points={points}
                isLoading={isLoading}
                error={error}
                onHoveredSessionIdChange={(sessionId) => {
                  setMapHoveredSessionId(
                    sessionId ? (sessionId as Id<"sessions">) : null,
                  );
                }}
              />
            </div>
            <p className="mt-2 max-w-sm text-left text-xs leading-snug text-muted-foreground">
              UMAP projection of session centroids for the current scope.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
