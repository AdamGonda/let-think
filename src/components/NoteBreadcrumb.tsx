import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const GO_TO_SESSION_LEAF = "Go to session";

const crumbButtonClass =
  "max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left font-medium text-foreground/90 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface NoteBreadcrumbProps {
  projectName: string;
  sessionName: string;
  onProjectClick: () => void;
  onSessionClick: () => void;
  onFileClick: () => void;
  fileLabel?: string;
}

export function NoteBreadcrumb({
  projectName,
  sessionName,
  onProjectClick,
  onSessionClick,
  onFileClick,
  fileLabel = GO_TO_SESSION_LEAF,
}: NoteBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 w-full shrink-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <li className="min-w-0">
          <button
            type="button"
            className={cn("block w-full min-w-0", crumbButtonClass)}
            title={projectName}
            onClick={onProjectClick}
          >
            {projectName}
          </button>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <button
            type="button"
            className={cn("block w-full min-w-0", crumbButtonClass)}
            title={sessionName}
            onClick={onSessionClick}
          >
            {sessionName}
          </button>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="min-w-0">
          <button
            type="button"
            className={cn("block w-full min-w-0 underline", crumbButtonClass)}
            title={fileLabel}
            aria-label={`${fileLabel}: ${sessionName}`}
            onClick={onFileClick}
          >
            {fileLabel}
          </button>
        </li>
      </ol>
    </nav>
  );
}
