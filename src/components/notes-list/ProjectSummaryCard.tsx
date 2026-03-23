import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { MoreVertical } from "lucide-react";
import type { ProjectWithSessions } from "@/components/session-sidebar/workspaceTypes";
import {
  formatUpdatedLabel,
  groupActivityMs,
  groupDisplayName,
} from "@/lib/notesListUtils";

type ProjectSummaryCardProps = {
  group: ProjectWithSessions;
  isPinned: boolean;
  pinLabelId: string | undefined;
  onDrill: () => void;
  onTogglePin: () => void;
};

export function ProjectSummaryCard({
  group,
  isPinned,
  pinLabelId,
  onDrill,
  onTogglePin,
}: ProjectSummaryCardProps) {
  const title = groupDisplayName(group);
  const sessions = group.sessions;
  const count = sessions.length;
  const sessionCountLabel =
    count === 0
      ? "No sessions yet"
      : count === 1
        ? "1 session"
        : `${count} sessions`;
  const activity = groupActivityMs(
    sessions,
    group.project?.createdAt ?? 0,
  );
  const emptyInbox = group.project == null && count === 0;
  const projectId = group.project?._id;

  return (
    <div
      className={`relative rounded-xl ${
        group.project == null
          ? "border-4 border-border"
          : "border-2 border-border/90"
      }`}
    >
      <button
        type="button"
        onClick={onDrill}
        className="flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 pr-12 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-foreground leading-snug line-clamp-2">
            {title}
          </span>
          {group.project == null && (
            <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Inbox
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
          {sessionCountLabel}
        </p>
        <p className="text-xs text-muted-foreground/90 pt-1">
          {emptyInbox ? "—" : formatUpdatedLabel(activity)}
        </p>
      </button>
      {projectId ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className="absolute right-2 top-2 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${title} options`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[220px]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              closeOnClick={false}
              className="flex cursor-default items-center justify-between gap-4 py-2.5"
              onClick={(e) => e.preventDefault()}
            >
              <span
                id={pinLabelId}
                className="text-sm text-foreground"
              >
                Pin to top
              </span>
              <Switch
                checked={isPinned}
                onCheckedChange={onTogglePin}
                aria-labelledby={pinLabelId}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
