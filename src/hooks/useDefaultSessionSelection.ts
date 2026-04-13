import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppUiActor } from "./useAppUi";
import { setActiveProject, setActiveSession } from "@/lib/appUiCommands";

/**
 * First-message session creation. Default session selection and empty-workspace
 * clearing are handled by the app UI machine and session bridge.
 */
export function useDefaultSessionSelection() {
  const actor = useAppUiActor();
  const createSessionMutation = useMutation(api.sessions.create);

  const handleCreateSessionForFirstMessage = useCallback(async () => {
    const id = await createSessionMutation({});
    setActiveSession(actor, id);
    setActiveProject(actor, null);
    return id;
  }, [createSessionMutation, actor]);

  return { handleCreateSessionForFirstMessage };
}
