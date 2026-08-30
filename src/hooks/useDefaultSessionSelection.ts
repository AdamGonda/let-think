import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppUiActor } from "./useAppUi";
import {
  setActiveChatSession,
  setActiveFile,
  setActiveProject,
  setActiveSession,
} from "@/lib/appUiCommands";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * First-message file/session creation. Default selection and empty-workspace
 * clearing are handled by the app UI machine and session bridge.
 */
export function useDefaultSessionSelection() {
  const actor = useAppUiActor();
  const createFile = useMutation(api.files.create);
  const createChatSession = useMutation(api.chatSessions.create);

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const created = await createFile({});
    setActiveFile(actor, created.fileId);
    setActiveSession(actor, created.sessionId);
    setActiveProject(actor, null);
    return created.sessionId;
  }, [createFile, actor]);

  const handleCreateChatSession = useCallback(
    async (fileId: Id<"files">) => {
      const id = await createChatSession({ fileId });
      setActiveChatSession(actor, id);
      return id;
    },
    [createChatSession, actor],
  );

  return { handleCreateSessionForFirstMessage, handleCreateChatSession };
}
