import { clsx } from "clsx";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import {
  formatUpdatedLabel,
  groupActivityMs,
  groupDisplayName,
} from "@/lib/notesListUtils";

type ProjectSummaryCardProps = {
  group: ProjectWithSessions;
  /** True when the globally active session belongs to this project or Inbox. */
  isSelected: boolean;
  onDrill: () => void;
};

export function ProjectSummaryCard({
  group,
  isSelected,
  onDrill,
}: ProjectSummaryCardProps) {
  const title = groupDisplayName(group);
  const sessions = group.sessions;
  const count = sessions.length;
  const fileCountLabel =
    count === 0
      ? "No files yet"
      : count === 1
        ? "1 file"
        : `${count} files`;
  const activity = groupActivityMs(
    sessions,
    group.project?.createdAt ?? 0,
  );

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border-2",
        isSelected ? "border-sidebar-primary" : "border-border/90",
      )}
    >
      <CornerRippleBackdrop />
      <button
        type="button"
        aria-current={isSelected ? "true" : undefined}
        onClick={onDrill}
        className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1 text-base font-semibold leading-[1.25] text-foreground line-clamp-2">
            {title}
          </span>
          <span className="shrink-0 text-right text-base font-normal leading-[1.25] text-muted-foreground tabular-nums">
            {fileCountLabel}
          </span>
        </div>
        <p className="mt-auto text-xs text-muted-foreground/90 pt-1">
          {count === 0 ? "—" : formatUpdatedLabel(activity)}
        </p>
      </button>
    </div>
  );
}
