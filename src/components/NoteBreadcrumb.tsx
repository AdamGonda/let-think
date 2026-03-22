import { ChevronRight } from "lucide-react";

/** First markdown heading in the note body, for the breadcrumb leaf. */
export function noteHeadingFromMarkdown(markdown: string): string | undefined {
  const m = markdown.match(/^\s*#{1,6}\s+(.+)$/m);
  if (!m) return undefined;
  const title = m[1]!.trim().replace(/\s+#+\s*$/, "").trim();
  if (!title) return undefined;
  return title.length > 80 ? `${title.slice(0, 79)}…` : title;
}

interface NoteBreadcrumbProps {
  sessionTitle: string;
  noteTitle: string;
}

export function NoteBreadcrumb({
  sessionTitle,
  noteTitle,
}: NoteBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 w-full shrink-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <li className="min-w-0">
          <span className="px-1 py-0.5 font-medium text-foreground/90">
            Projects
          </span>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <span
            className="block max-w-full truncate px-1 py-0.5 font-medium text-foreground/90"
            title={sessionTitle}
          >
            {sessionTitle}
          </span>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li
          className="min-w-0 truncate font-medium text-foreground"
          aria-current="page"
        >
          {noteTitle}
        </li>
      </ol>
    </nav>
  );
}
