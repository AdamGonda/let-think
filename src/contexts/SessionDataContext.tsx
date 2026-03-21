import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "../hooks/useSessionManager";

export type ConceptGraphData = {
  nodes: Array<{ id: string; name: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
  batches?: Array<{
    id: string;
    nodeIds: string[];
    promptSummary?: string;
    description?: string;
  }>;
};

export type SessionMessage = {
  _id?: Id<"messages">;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  topic?: string;
  mentions?: Array<{
    start: number;
    end: number;
    conceptId: string;
    name: string;
  }>;
};

export type SessionDataContextValue = {
  /** Concept graph for the active session (reactive, always subscribed when sessionId set) */
  conceptGraph: ConceptGraphData | null | undefined;
  /** Message history for the active session (paginated, chronological) */
  messages: SessionMessage[];
  /** Load older messages (history panel / long threads) */
  loadOlderMessages: (count?: number) => void;
  /** True while first page of messages is loading */
  messagesLoading: boolean;
  /** More older messages available via loadOlderMessages */
  canLoadOlderMessages: boolean;
  /** Batches derived from concept graph */
  batches: NonNullable<ConceptGraphData["batches"]>;
  /** Interactions remaining until long break */
  remaining: number | null;
  /** Break countdown in ms when in break */
  breakRemainingMs: number | null;
  /** Session manager actions */
  canSend: boolean;
  onInteractionComplete: () => Promise<void>;
  startBreakOptimistically: () => Promise<void>;
};

const SessionDataContext = createContext<SessionDataContextValue | null>(null);

export function SessionDataProvider({
  sessionId,
  children,
}: {
  sessionId: Id<"sessions"> | null;
  children: ReactNode;
}) {
  const conceptGraph = useQuery(
    api.sessions.getConceptGraph,
    sessionId ? { sessionId } : "skip"
  );
  const {
    results: messageResults,
    status: messagesStatus,
    loadMore,
  } = usePaginatedQuery(
    api.sessions.listMessagesPaginated,
    sessionId ? { sessionId } : "skip",
    { initialNumItems: 60 }
  );

  const messages = useMemo((): SessionMessage[] => {
    return [...messageResults]
      .reverse()
      .map((m) => ({
        _id: m._id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        topic: m.topic,
        mentions: m.mentions,
      }));
  }, [messageResults]);

  const loadOlderMessages = useCallback(
    (count = 60) => {
      loadMore(count);
    },
    [loadMore]
  );

  const messagesLoading = messagesStatus === "LoadingFirstPage";
  const canLoadOlderMessages = messagesStatus === "CanLoadMore";

  const {
    remaining,
    breakRemainingMs,
    canSend,
    onInteractionComplete,
    startBreakOptimistically,
  } = useSessionManager(sessionId);

  const batches = useMemo(
    () => conceptGraph?.batches ?? [],
    [conceptGraph?.batches]
  );

  const value = useMemo<SessionDataContextValue>(
    () => ({
      conceptGraph: conceptGraph ?? null,
      messages,
      loadOlderMessages,
      messagesLoading,
      canLoadOlderMessages,
      batches,
      remaining,
      breakRemainingMs,
      canSend,
      onInteractionComplete,
      startBreakOptimistically,
    }),
    [
      conceptGraph,
      messages,
      loadOlderMessages,
      messagesLoading,
      canLoadOlderMessages,
      batches,
      remaining,
      breakRemainingMs,
      canSend,
      onInteractionComplete,
      startBreakOptimistically,
    ]
  );

  return (
    <SessionDataContext.Provider value={value}>
      {children}
    </SessionDataContext.Provider>
  );
}

export function useSessionData() {
  const ctx = useContext(SessionDataContext);
  if (!ctx) {
    throw new Error("useSessionData must be used within SessionDataProvider");
  }
  return ctx;
}

export function useSessionDataOptional(): SessionDataContextValue | null {
  return useContext(SessionDataContext);
}
