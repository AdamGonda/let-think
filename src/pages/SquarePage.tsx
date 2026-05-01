import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <Link
            to="/app"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to app
          </Link>
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
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-lg font-medium">
                        {entry.titleSnapshot?.trim() || "Untitled idea"}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        By {entry.authorDisplayName?.trim() || "Unknown author"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-primary">
                      Read idea →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
