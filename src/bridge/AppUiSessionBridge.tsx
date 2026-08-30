import { type ReactNode } from "react";
import { useAppUiActor } from "../hooks/useAppUi";
import { useSessionData } from "../contexts/SessionDataContext";
import type { ProjectWithSessions } from "../components/session-sidebar/workspaceTypes";
import type { Id } from "../../convex/_generated/dataModel";
import {
  useSyncBatchesLength,
  useSyncChatHistoryMeta,
  useSyncWorkspaceSnapshot,
} from "./sessionBridgeHooks";

/**
 * Maps Convex session/workspace data to machine snapshot events (thin composition).
 */
export function AppUiSessionBridge({
  workspace,
  activeSessionId,
  children,
}: {
  workspace: ProjectWithSessions[] | undefined;
  activeSessionId: Id<"sessions"> | null;
  children: ReactNode;
}) {
  const actor = useAppUiActor();
  const {
    messages,
    messagesLoading,
    canLoadOlderMessages,
    batches,
  } = useSessionData();

  const hasChatHistory = messages.length > 0 || canLoadOlderMessages;

  useSyncChatHistoryMeta(actor, hasChatHistory, messagesLoading);
  useSyncBatchesLength(actor, activeSessionId, batches.length);
  useSyncWorkspaceSnapshot(actor, workspace);

  return <>{children}</>;
}
