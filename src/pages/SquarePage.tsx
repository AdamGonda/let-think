import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

function formatPublishedAt(value: number): string {
  return new Date(value).toLocaleString();
}

export function SquarePage() {
  const entries = useQuery(api.publicFiles.listPublic);
  const [cachedEntries, setCachedEntries] = useState<Array<Doc<"public_files">>>([]);

  useEffect(() => {
    if (entries !== undefined) {
      setCachedEntries(entries);
    }
  }, [entries]);

  const displayEntries = entries ?? cachedEntries;
  const isInitialLoading = entries === undefined && cachedEntries.length === 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute top-6 left-4 z-10 sm:left-6 lg:left-8">
        <Link
          to="/app"
          className="inline-flex items-center text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Back to app
        </Link>
      </div>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Square</h1>
          <p className="text-sm text-muted-foreground">
            Publicly shared session notes from the community.
          </p>
        </div>

        {isInitialLoading ? (
          <p className="text-sm text-muted-foreground">Loading published notes…</p>
        ) : displayEntries.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-card p-4 text-sm text-muted-foreground">
            No published notes yet.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayEntries.map((entry) => (
              <li
                key={entry._id}
                className="h-full rounded-xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40"
              >
                <Link
                  to="/square/$publicFileId"
                  params={{ publicFileId: entry._id }}
                  className="flex h-full flex-col"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-medium">
                      {entry.titleSnapshot?.trim() || "Untitled idea"}
                    </h2>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {formatPublishedAt(entry.publishedAt)}
                    </time>
                  </div>
                  <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
                    {(entry.thinkingNotesSnapshot?.trim() ||
                      entry.draftInputSnapshot?.trim() ||
                      "No notes snapshot available.")}
                  </p>
                  <span className="mt-4 text-sm font-medium text-primary">
                    Read idea →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
