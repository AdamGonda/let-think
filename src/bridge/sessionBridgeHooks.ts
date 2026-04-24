import { useEffect, useRef } from "react";
import type { AppUiActorRef } from "@/contexts/appUiActorContext";
import type { ProjectWithSessions } from "@/components/session-sidebar/SessionSidebar";
import type { Id } from "../../convex/_generated/dataModel";
import { buildWorkspaceSnapshot } from "@/lib/workspaceQueries";

export function useSyncChatHistoryMeta(
  actor: AppUiActorRef,
  hasChatHistory: boolean,
  messagesLoading: boolean,
): void {
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
}

export function useSyncBatchesLength(
  actor: AppUiActorRef,
  activeSessionId: Id<"sessions"> | null,
  batchesLength: number,
): void {
  const prevBatchesLenRef = useRef(0);
  useEffect(() => {
    prevBatchesLenRef.current = 0;
  }, [activeSessionId]);

  useEffect(() => {
    const len = batchesLength;
    if (len === 0) return;
    if (prevBatchesLenRef.current === len) return;
    prevBatchesLenRef.current = len;
    actor.send({ type: "BATCHES_LENGTH_CHANGED", length: len });
  }, [batchesLength, actor]);
}

export function useSyncWorkspaceSnapshot(
  actor: AppUiActorRef,
  workspace: ProjectWithSessions[] | undefined,
): void {
  const prevWorkspaceKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const snap = buildWorkspaceSnapshot(workspace);
    if (snap === null) return;
    const key = JSON.stringify(snap);
    if (prevWorkspaceKeyRef.current === key) return;
    prevWorkspaceKeyRef.current = key;
    actor.send({ type: "WORKSPACE_SNAPSHOT", ...snap });
  }, [workspace, actor]);
}
