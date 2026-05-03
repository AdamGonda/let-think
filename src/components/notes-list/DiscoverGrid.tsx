import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { NotesListLoading } from "./NotesListLoading";
import { PublishedNoteCard } from "./PublishedNoteCard";

type DiscoverGridProps = {
  /** Dispatches `PUBLISHED_NOTE_VIEWER_OPEN` via the app UI command layer. */
  onOpenPublishedNote: (sessionId: Id<"sessions">) => void;
};

/**
 * Discover view body — fetches the global published-notes feed and renders
 * a grid of cards. Opening a card is handled by the app UI machine (viewer
 * dialog is mounted in `WorkspaceMainColumn`).
 */
export function DiscoverGrid({ onOpenPublishedNote }: DiscoverGridProps) {
  const items = useQuery(api.publishedSessions.listPublished);

  if (items === undefined) {
    return <NotesListLoading />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto py-6">
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nothing has been published yet. Be the first — open a session and hit
          Publish on its file card.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <li key={item.sessionId}>
              <PublishedNoteCard
                sessionId={item.sessionId}
                title={item.title}
                publisherName={item.publisherName}
                publishedAt={item.publishedAt}
                isMine={item.isMine}
                onOpen={onOpenPublishedNote}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
