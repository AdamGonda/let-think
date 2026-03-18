import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface NotesListPanelProps {
  onSelectSession: (session: Doc<"sessions">) => void;
}

export function NotesListPanel({ onSelectSession }: NotesListPanelProps) {
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
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-base py-6 px-6 text-center gap-2">
        <p>No sessions yet</p>
        <p className="text-sm">Create a chat to start taking thinking notes</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="shrink-0 p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sessions by title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSessions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No sessions match "{searchQuery}"
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filteredSessions.map((session: Doc<"sessions">) => (
              <li key={session._id}>
                <button
                  type="button"
                  onClick={() => onSelectSession(session)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted hover:border-border transition-colors text-sm truncate cursor-pointer"
                >
                  {session.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
