import { useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAppUiActor } from "./useAppUi";
import { setNotesChatLoading } from "@/lib/appUiCommands";

export type NotesChatMessage = {
  _id: Id<"notesChatMessages">;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export function useNotesChat(
  sessionId: Id<"sessions"> | null,
  thinkingNotesSnapshot: string,
  enabled: boolean,
) {
  const actor = useAppUiActor();
  const sendNotesChat = useAction(api.notesChatActions.send);

  const messages = useQuery(
    api.notesChat.listBySession,
    sessionId && enabled ? { sessionId } : "skip",
  );

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!sessionId) return;
      const trimmed = userContent.trim();
      if (!trimmed) return;

      setNotesChatLoading(actor, true);
      try {
        await sendNotesChat({
          sessionId,
          userContent: trimmed,
          thinkingNotesSnapshot,
        });
      } finally {
        setNotesChatLoading(actor, false);
      }
    },
    [actor, sendNotesChat, sessionId, thinkingNotesSnapshot],
  );

  return {
    messages: (messages ?? []) as NotesChatMessage[],
    messagesLoading: enabled && sessionId != null && messages === undefined,
    sendMessage,
  };
}
