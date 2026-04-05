import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppUiActor } from "./useAppUi";

/**
 * First-message session creation. Default session selection and empty-workspace
 * clearing are handled by the app UI machine and session bridge.
 */
export function useDefaultSessionSelection() {
  const actor = useAppUiActor();
  const createSessionMutation = useMutation(api.sessions.create);

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const id = await createSessionMutation({});
    actor.send({ type: "ACTIVE_SESSION_SET", sessionId: id });
    actor.send({ type: "ACTIVE_PROJECT_SET", projectId: null });
    return id;
  }, [createSessionMutation, actor]);

  return { handleCreateSessionForFirstMessage };
}
