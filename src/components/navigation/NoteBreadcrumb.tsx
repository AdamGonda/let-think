import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PROJECTS_ROOT_LABEL = "Projects";

const crumbButtonClass =
  "max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left font-medium text-foreground/90 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface NoteBreadcrumbProps {
  projectName: string;
  /** Session note title shown as the current file (non-interactive). */
  fileName: string;
  /** When false, crumbs are visible but not clickable (session still settling). */
  interactive?: boolean;
  onProjectsRootClick: () => void;
  onProjectNameClick: () => void;
}

const fileCrumbClass =
  "max-w-full min-w-0 truncate px-1 py-0.5 font-medium text-foreground/90 underline decoration-foreground/35 underline-offset-2";

const disabledCrumbWrap =
  "cursor-not-allowed text-muted-foreground/45 opacity-80";

export function NoteBreadcrumb({
  projectName,
  fileName,
  interactive = true,
  onProjectsRootClick,
  onProjectNameClick,
}: NoteBreadcrumbProps) {
  const crumbInteractiveClass = interactive
    ? crumbButtonClass
    : cn(
        "max-w-full truncate rounded px-1 py-0.5 text-left font-medium transition-colors",
        disabledCrumbWrap,
      );

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 w-full shrink-0"
      aria-disabled={!interactive || undefined}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <li className="min-w-0">
          <button
            type="button"
            className={cn(
              "inline-block max-w-full min-w-0",
              crumbInteractiveClass,
            )}
            title={PROJECTS_ROOT_LABEL}
            disabled={!interactive}
            onClick={interactive ? onProjectsRootClick : undefined}
          >
            {PROJECTS_ROOT_LABEL}
          </button>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <button
            type="button"
            className={cn("block w-full min-w-0", crumbInteractiveClass)}
            title={projectName}
            disabled={!interactive}
            onClick={interactive ? onProjectNameClick : undefined}
          >
            {projectName}
          </button>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <span className={fileCrumbClass} title={fileName} aria-current="page">
            {fileName}
          </span>
        </li>
      </ol>
    </nav>
  );
}
