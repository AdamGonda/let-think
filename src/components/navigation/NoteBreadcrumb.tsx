import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const crumbButtonClass =
  "max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left font-medium text-foreground/90 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface NoteBreadcrumbProps {
  projectName: string;
  /** Session note title shown as the current file. */
  fileName: string;
  /** When false, crumbs are visible but not clickable (session still settling). */
  interactive?: boolean;
  /** Wake-up overlay exit animation: non-interactive, muted look, default cursor. */
  isExiting?: boolean;
  onProjectNameClick: () => void;
  /** When set, the current file crumb opens a session switcher. */
  onFileNameClick?: () => void;
  fileNameMenuOpen?: boolean;
  className?: string;
}

const fileCrumbClass =
  "max-w-full min-w-0 truncate px-1 py-0.5 font-medium text-foreground/90 underline decoration-foreground/35 underline-offset-2";

const disabledCrumbWrap =
  "cursor-not-allowed text-muted-foreground/45 opacity-80 disabled:cursor-not-allowed";

const exitingCrumbWrap =
  "cursor-default text-muted-foreground/50 opacity-70 disabled:cursor-default";

export function NoteBreadcrumb({
  projectName,
  fileName,
  interactive = true,
  isExiting = false,
  onProjectNameClick,
  onFileNameClick,
  fileNameMenuOpen = false,
  className,
}: NoteBreadcrumbProps) {
  const crumbInteractiveClass = interactive
    ? crumbButtonClass
    : cn(
        "max-w-full truncate rounded px-1 py-0.5 text-left font-medium transition-colors",
        isExiting ? exitingCrumbWrap : disabledCrumbWrap,
      );

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("min-w-0 w-full shrink-0", className)}
      aria-disabled={!interactive || undefined}
    >
      <ol className="flex min-w-0 flex-nowrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <li className="min-w-0 shrink">
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
        <li className="min-w-0 shrink">
          {onFileNameClick && interactive ? (
            <button
              type="button"
              className={cn(
                fileCrumbClass,
                "inline-flex max-w-full min-w-0 cursor-pointer items-center gap-0.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              title={fileName}
              aria-current="page"
              aria-haspopup="dialog"
              aria-expanded={fileNameMenuOpen}
              aria-label={`${fileName}. Switch chat`}
              data-tour="session-title"
              onClick={onFileNameClick}
            >
              <span className="min-w-0 truncate">{fileName}</span>
              <ChevronDown className="size-3.5 shrink-0 opacity-70" />
            </button>
          ) : (
            <span
              className={cn(
                fileCrumbClass,
                !interactive &&
                  (isExiting
                    ? "cursor-default no-underline text-muted-foreground/50 opacity-70"
                    : "cursor-not-allowed no-underline text-muted-foreground/45 opacity-80"),
              )}
              title={fileName}
              aria-current="page"
              data-tour="session-title"
            >
              {fileName}
            </span>
          )}
        </li>
      </ol>
    </nav>
  );
}
