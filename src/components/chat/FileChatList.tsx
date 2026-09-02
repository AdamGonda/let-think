import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { timings } from "@/config";
import { editorScrollThumbLayout } from "@/components/editor/editorScrollThumbLayout";
import type { Id } from "../../../convex/_generated/dataModel";

export type FileChatListItem = {
  _id: Id<"chatSessions">;
  title: string;
};

type FileChatListProps = {
  chats: FileChatListItem[];
  activeChatSessionId: Id<"chatSessions"> | null;
  onSelect: (id: Id<"chatSessions">) => void;
  onNewChat: () => void;
};

export function FileChatList({
  chats,
  activeChatSessionId,
  onSelect,
  onNewChat,
}: FileChatListProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollThumbRef = useRef<HTMLDivElement | null>(null);
  const hideThumbTimerRef = useRef(0);

  useEffect(() => {
    return () => window.clearTimeout(hideThumbTimerRef.current);
  }, []);

  const updateScrollThumb = (el: HTMLDivElement) => {
    const thumb = scrollThumbRef.current;
    if (!thumb) return;
    const next = editorScrollThumbLayout(
      el.clientHeight,
      el.scrollHeight,
      el.scrollTop,
    );
    if (!next) {
      thumb.style.transition = "opacity 0.5s ease";
      thumb.style.opacity = "0";
      return;
    }
    thumb.style.height = `${next.height}px`;
    thumb.style.transform = `translateY(${next.top}px)`;
    thumb.style.transition = "opacity 0.12s ease";
    thumb.style.opacity = "1";
    window.clearTimeout(hideThumbTimerRef.current);
    hideThumbTimerRef.current = window.setTimeout(() => {
      thumb.style.transition = "opacity 0.5s ease";
      thumb.style.opacity = "0";
    }, timings.editorScrollbarIdleMs);
  };

  return (
    <aside
      className="flex h-[min(70vh,28rem)] w-52 flex-col overflow-hidden rounded-2xl border border-border shadow-lg"
      style={{ backgroundColor: "#2B2B28" }}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">Chats</p>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={(e) => updateScrollThumb(e.currentTarget)}
          className="overlay-scroll h-full overflow-y-auto px-2 pb-3"
        >
          {chats.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No chats yet.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {chats.map((chat) => {
                const selected = chat._id === activeChatSessionId;
                return (
                  <li key={chat._id}>
                    <button
                      type="button"
                      className={clsx(
                        "flex h-9 w-full cursor-pointer items-center rounded-md px-3 text-left text-sm",
                        selected
                          ? "bg-muted font-medium text-foreground"
                          : "bg-muted/30 text-foreground/90 hover:bg-muted/60",
                      )}
                      aria-current={selected ? "page" : undefined}
                      onClick={() => onSelect(chat._id)}
                      title={chat.title.trim() || "Untitled"}
                    >
                      <span className="truncate">
                        {chat.title.trim() || "Untitled"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div ref={scrollThumbRef} className="editor-scroll-thumb" aria-hidden />
      </div>
    </aside>
  );
}
