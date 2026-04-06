import { type ReactNode } from "react";
import { useAppUiActor } from "../hooks/useAppUi";
import { useSessionData } from "../contexts/SessionDataContext";
import type { ProjectWithSessions } from "../components/SessionSidebar";
import type { Id } from "../../convex/_generated/dataModel";
import {
  useSyncBatchesLength,
  useSyncBreakState,
  useSyncChatHistoryMeta,
  useSyncRestWalkthroughStorage,
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
    breakRemainingMs,
  } = useSessionData();

  const hasChatHistory = messages.length > 0 || canLoadOlderMessages;
  const isInBreak = breakRemainingMs !== null && breakRemainingMs > 0;

  useSyncChatHistoryMeta(actor, hasChatHistory, messagesLoading);
  useSyncBreakState(actor, isInBreak);
  useSyncBatchesLength(actor, activeSessionId, batches.length);
  useSyncWorkspaceSnapshot(actor, workspace);
  useSyncRestWalkthroughStorage(actor, activeSessionId);

  return <>{children}</>;
}
