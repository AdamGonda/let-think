import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import {
  formatUpdatedLabel,
  groupActivityMs,
  groupDisplayName,
} from "@/lib/notesListUtils";

type ProjectSummaryCardProps = {
  group: ProjectWithSessions;
  onDrill: () => void;
};

export function ProjectSummaryCard({ group, onDrill }: ProjectSummaryCardProps) {
  const title = groupDisplayName(group);
  const sessions = group.sessions;
  const count = sessions.length;
  const fileCountLabel =
    count === 0
      ? "No files yet"
      : count === 1
        ? "1 file"
        : `${count} files`;
  const fallbackCreatedAt = sessions[0]?.createdAt ?? Date.now();
  const activity = groupActivityMs(sessions, group.project?.createdAt ?? fallbackCreatedAt);

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-border/90">
      <CornerRippleBackdrop />
      <button
        type="button"
        onClick={onDrill}
        className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-foreground leading-snug line-clamp-2">
            {title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
          {fileCountLabel}
        </p>
        <p className="text-xs text-muted-foreground/90 pt-1">
          {count === 0 ? "—" : formatUpdatedLabel(activity)}
        </p>
      </button>
    </div>
  );
}
