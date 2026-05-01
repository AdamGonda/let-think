import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function formatPublishedAt(value: number): string {
  return new Date(value).toLocaleString();
}

export function SquarePage() {
  const entries = useQuery(api.publicFiles.listPublic);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Town Square</h1>
          <p className="text-sm text-muted-foreground">
            Publicly shared session notes from the community.
          </p>
          <Link
            to="/app"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to app
          </Link>
        </div>

        {entries === undefined ? (
          <p className="text-sm text-muted-foreground">Loading published notes…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-card p-4 text-sm text-muted-foreground">
            No published notes yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry._id}
                className="rounded-lg border border-border/70 bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-base font-medium">
                    {entry.titleSnapshot?.trim() || "Untitled session"}
                  </h2>
                  <time className="text-xs text-muted-foreground">
                    {formatPublishedAt(entry.publishedAt)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {entry.thinkingNotesSnapshot?.trim() ||
                    entry.draftInputSnapshot?.trim() ||
                    "No notes snapshot available."}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
