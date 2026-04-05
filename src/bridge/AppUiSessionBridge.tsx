import { useEffect, useRef, type ReactNode } from "react";
import { useAppUiActor } from "../hooks/useAppUi";
import { useSessionData } from "../contexts/SessionDataContext";
import type { ProjectWithSessions } from "../components/SessionSidebar";
import type { Id } from "../../convex/_generated/dataModel";
import { isRestWalkthroughDoneForSession } from "../lib/restSessionWalkthroughStorage";

function buildWorkspaceSnapshot(workspace: ProjectWithSessions[] | undefined): {
  inboxEmpty: boolean;
  hasProjects: boolean;
  firstSessionId: Id<"sessions"> | null;
  firstProjectId: Id<"projects"> | null;
} | null {
  if (workspace === undefined) return null;
  const hasProjects = workspace.some((g) => g.project != null);
  const inboxGroup = workspace.find((g) => g.project == null);
  const inboxEmpty = !inboxGroup || inboxGroup.sessions.length === 0;
  const allSessions = workspace
    .flatMap((g) => g.sessions)
    .sort((a, b) => b.createdAt - a.createdAt);
  const first = allSessions[0];
  return {
    inboxEmpty,
    hasProjects,
    firstSessionId: first?._id ?? null,
    firstProjectId: first?.projectId ?? null,
  };
}

/**
 * Maps Convex session/workspace data to machine snapshot events (single orchestration entry).
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

  const prevChatMetaRef = useRef<{ hc: boolean; ml: boolean } | null>(null);
  useEffect(() => {
    const next = { hc: hasChatHistory, ml: messagesLoading };
    const p = prevChatMetaRef.current;
    if (p && p.hc === next.hc && p.ml === next.ml) return;
    prevChatMetaRef.current = next;
    actor.send({
      type: "CHAT_HISTORY_META",
      hasChatHistory: next.hc,
      messagesLoading: next.ml,
    });
  }, [hasChatHistory, messagesLoading, actor]);

  const prevBreakRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevBreakRef.current === isInBreak) return;
    prevBreakRef.current = isInBreak;
    actor.send({ type: "BREAK_CHANGED", inBreak: isInBreak });
  }, [isInBreak, actor]);

  const prevBatchesLenRef = useRef(0);
  useEffect(() => {
    prevBatchesLenRef.current = 0;
  }, [activeSessionId]);

  useEffect(() => {
    const len = batches.length;
    if (len === 0) return;
    if (prevBatchesLenRef.current === len) return;
    prevBatchesLenRef.current = len;
    actor.send({ type: "BATCHES_LENGTH_CHANGED", length: len });
  }, [batches.length, actor]);

  const prevWorkspaceKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const snap = buildWorkspaceSnapshot(workspace);
    if (snap === null) return;
    const key = JSON.stringify(snap);
    if (prevWorkspaceKeyRef.current === key) return;
    prevWorkspaceKeyRef.current = key;
    actor.send({ type: "WORKSPACE_SNAPSHOT", ...snap });
  }, [workspace, actor]);

  useEffect(() => {
    const done =
      activeSessionId != null &&
      isRestWalkthroughDoneForSession(activeSessionId);
    actor.send({
      type: "REST_WALKTHROUGH_STORAGE_SYNC",
      doneForActiveSession: done,
    });
  }, [activeSessionId, actor]);

  return <>{children}</>;
}
