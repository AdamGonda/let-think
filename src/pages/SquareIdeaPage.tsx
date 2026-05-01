import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function formatPublishedAt(value: number): string {
  return new Date(value).toLocaleString();
}

export function SquareIdeaPage() {
  const { publicFileId } = useParams({ from: "/square/$publicFileId" });
  const entry = useQuery(api.publicFiles.getPublicById, {
    publicFileId: publicFileId as Id<"public_files">,
  });

  if (entry === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <div className="space-y-3">
            <Link
              to="/square"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Back to square
            </Link>
            <div className="h-10 w-64 animate-pulse rounded-md bg-muted/40" />
            <div className="h-4 w-44 animate-pulse rounded-md bg-muted/30" />
          </div>

          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-[92%] animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-[88%] animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-[80%] animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-[75%] animate-pulse rounded bg-muted/30" />
            </div>
          </article>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <Link
            to="/square"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to square
          </Link>
          {entry === null ? (
            <h1 className="text-3xl font-semibold tracking-tight">Idea not found</h1>
          ) : (
            <>
              <h1 className="text-4xl font-semibold tracking-tight">
                {entry.titleSnapshot?.trim() || "Untitled idea"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Published {formatPublishedAt(entry.publishedAt)}
              </p>
            </>
          )}
        </div>

        {entry && (
          <article className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
            <p className="whitespace-pre-wrap text-base leading-7 text-foreground/95">
              {(entry.thinkingNotesSnapshot?.trim() ||
                entry.draftInputSnapshot?.trim() ||
                "No content available for this idea.")}
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
