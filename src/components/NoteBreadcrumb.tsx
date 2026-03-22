import { ChevronRight } from "lucide-react";

interface NoteBreadcrumbProps {
  sessionName: string;
}

export function NoteBreadcrumb({ sessionName }: NoteBreadcrumbProps) {
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
          <span className="px-1 py-0.5 font-medium text-foreground/90">
            Sessions
          </span>
        </li>
        <li aria-hidden className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li
          className="min-w-0 truncate font-medium text-foreground"
          aria-current="page"
          title={sessionName}
        >
          {sessionName}
        </li>
      </ol>
    </nav>
  );
}
