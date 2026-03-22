import { ChevronRight } from "lucide-react";

const FILE_BREADCRUMB_LEAF = "File";

interface NoteBreadcrumbProps {
  projectName: string;
  sessionName: string;
}

export function NoteBreadcrumb({
  projectName,
  sessionName,
}: NoteBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 w-full shrink-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <li className="min-w-0">
          <span
            className="block max-w-full truncate px-1 py-0.5 font-medium text-foreground/90"
            title={projectName}
          >
            {projectName}
          </span>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <span
            className="block max-w-full truncate px-1 py-0.5 font-medium text-foreground/90"
            title={sessionName}
          >
            {sessionName}
          </span>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li
          className="min-w-0 px-1 py-0.5 font-medium text-foreground/90"
          aria-current="page"
        >
          {FILE_BREADCRUMB_LEAF}
        </li>
      </ol>
    </nav>
  );
}
