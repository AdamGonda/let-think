import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(diff / 86400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

interface NotesListPanelProps {
  onSelectSession: (session: Doc<"sessions">) => void;
  onJumpToSession?: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({ onSelectSession, onJumpToSession }: NotesListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const sessions = useQuery(api.sessions.list);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s: Doc<"sessions">) =>
      s.title.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  if (!sessions) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-base py-6 px-6">
        Loading…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-base py-12 px-6 text-center gap-3">
        <div className="rounded-full bg-muted/50 p-4">
          <FileText className="size-8 text-muted-foreground/60" />
        </div>
        <p className="font-medium text-foreground">No sessions yet</p>
        <p className="text-sm max-w-[240px]">
          Create a session to start taking thinking notes
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-(--color-surface)">
      <div className="shrink-0 px-6 py-3 border-b border-border">
        <div className="max-w-2xl mx-auto px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search sessions by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/30 border-border/80 focus-visible:ring-2 focus-visible:ring-ring/40 transition-shadow hover:bg-muted/50"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {filteredSessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No sessions match &quot;{searchQuery}&quot;
              </p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {filteredSessions.map((session: Doc<"sessions">) => (
                <li key={session._id}>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 hover:bg-muted/50 hover:border-border hover:shadow-sm transition-colors duration-150 group">
                    <button
                      type="button"
                      onClick={() => onSelectSession(session)}
                      className="flex-1 min-w-0 text-left px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-l-lg flex items-center gap-3"
                    >
                      <p className="flex-1 min-w-0 text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-foreground">
                        {session.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {formatRelativeTime(session.createdAt)}
                      </span>
                    </button>
                    {onJumpToSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToSession(session);
                        }}
                        className="shrink-0 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[7rem] group-hover:opacity-100 group-hover:overflow-visible px-0 group-hover:px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-r-lg whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Go to session"
                      >
                        Go to session
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
