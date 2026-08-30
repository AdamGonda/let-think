import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
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
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border">
      <div className="flex items-center gap-2 px-3 py-3">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No chats yet.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {chats.map((chat) => {
              const selected = chat._id === activeChatSessionId;
              return (
                <li key={chat._id}>
                  <button
                    type="button"
                    className={clsx(
                      "w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm",
                      selected
                        ? "bg-muted font-medium text-foreground"
                        : "text-foreground/90 hover:bg-muted/60",
                    )}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => onSelect(chat._id)}
                  >
                    <span className="line-clamp-2">
                      {chat.title.trim() || "Untitled"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
