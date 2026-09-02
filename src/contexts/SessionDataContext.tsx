import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSessionManager } from "../hooks/useSessionManager";
import { CHAT_MESSAGES_PAGE_SIZE } from "@/config";

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
  _id?: string;
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
  imageUrls?: string[];
};

type SessionDataContextValue = {
  /** Concept graph for the active session (reactive, always subscribed when sessionId set) */
  conceptGraph: ConceptGraphData | null | undefined;
  /** Graph-lane message history (paginated, chronological) */
  messages: SessionMessage[];
  /** Chat-lane message history (paginated, chronological) */
  chatMessages: SessionMessage[];
  /** Client-only user bubble until the server row lands. */
  pendingChatUser: SessionMessage | null;
  setPendingChatUser: (message: SessionMessage | null) => void;
  loadOlderMessages: (count?: number) => void;
  loadOlderChatMessages: (count?: number) => void;
  messagesLoading: boolean;
  chatMessagesLoading: boolean;
  canLoadOlderMessages: boolean;
  canLoadOlderChatMessages: boolean;
  batches: NonNullable<ConceptGraphData["batches"]>;
  canSend: boolean;
};

type PendingChatUserState = {
  message: SessionMessage;
  afterUserId: string | undefined;
};

function lastUserMessage(
  messages: SessionMessage[],
): SessionMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "user") return msg;
  }
  return undefined;
}

const SessionDataContext = createContext<SessionDataContextValue | null>(null);

function mapPageToSessionMessages(
  results: Array<{
    _id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
    topic?: string;
    mentions?: SessionMessage["mentions"];
    imageUrls?: string[];
  }>,
): SessionMessage[] {
  return [...results].reverse().map((m) => ({
    _id: m._id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
    topic: m.topic,
    mentions: m.mentions,
    imageUrls: m.imageUrls,
  }));
}

export function SessionDataProvider({
  sessionId,
  chatSessionId,
  children,
}: {
  sessionId: Id<"sessions"> | null;
  chatSessionId: Id<"chatSessions"> | null;
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
    { initialNumItems: CHAT_MESSAGES_PAGE_SIZE }
  );
  const {
    results: chatMessageResults,
    status: chatMessagesStatus,
    loadMore: loadMoreChat,
  } = usePaginatedQuery(
    api.chatSessions.listMessagesPaginated,
    chatSessionId ? { chatSessionId } : "skip",
    { initialNumItems: CHAT_MESSAGES_PAGE_SIZE }
  );

  const messages = useMemo(
    () => mapPageToSessionMessages(messageResults),
    [messageResults],
  );
  const chatMessages = useMemo(
    () => mapPageToSessionMessages(chatMessageResults),
    [chatMessageResults],
  );

  const [pendingState, setPendingState] = useState<PendingChatUserState | null>(
    null,
  );
  const [pendingSessionId, setPendingSessionId] = useState(chatSessionId);

  if (chatSessionId !== pendingSessionId) {
    setPendingSessionId(chatSessionId);
    if (pendingSessionId) {
      setPendingState(null);
    }
  }

  const setPendingChatUser = useCallback(
    (message: SessionMessage | null) => {
      if (message === null) {
        setPendingState(null);
        return;
      }
      const lastUser = lastUserMessage(chatMessages);
      setPendingState({
        message,
        afterUserId: lastUser?._id,
      });
    },
    [chatMessages],
  );

  const lastServerUser = lastUserMessage(chatMessages);
  const pendingCaughtUp = Boolean(
    pendingState &&
      lastServerUser?._id &&
      lastServerUser._id !== pendingState.afterUserId &&
      lastServerUser.content === pendingState.message.content,
  );
  const switchedChat = Boolean(
    chatSessionId !== pendingSessionId && pendingSessionId,
  );

  const pendingChatUser =
    pendingCaughtUp || switchedChat
      ? null
      : (pendingState?.message ?? null);

  const loadOlderMessages = useCallback(
    (count = CHAT_MESSAGES_PAGE_SIZE) => {
      loadMore(count);
    },
    [loadMore]
  );
  const loadOlderChatMessages = useCallback(
    (count = CHAT_MESSAGES_PAGE_SIZE) => {
      loadMoreChat(count);
    },
    [loadMoreChat]
  );

  const messagesLoading = messagesStatus === "LoadingFirstPage";
  const chatMessagesLoading = chatMessagesStatus === "LoadingFirstPage";
  const canLoadOlderMessages = messagesStatus === "CanLoadMore";
  const canLoadOlderChatMessages = chatMessagesStatus === "CanLoadMore";

  const { canSend } = useSessionManager(sessionId);

  const batches = useMemo(
    () => conceptGraph?.batches ?? [],
    [conceptGraph?.batches]
  );

  const value = useMemo<SessionDataContextValue>(
    () => ({
      conceptGraph: conceptGraph ?? null,
      messages,
      chatMessages,
      pendingChatUser,
      setPendingChatUser,
      loadOlderMessages,
      loadOlderChatMessages,
      messagesLoading,
      chatMessagesLoading,
      canLoadOlderMessages,
      canLoadOlderChatMessages,
      batches,
      canSend,
    }),
    [
      conceptGraph,
      messages,
      chatMessages,
      pendingChatUser,
      setPendingChatUser,
      loadOlderMessages,
      loadOlderChatMessages,
      messagesLoading,
      chatMessagesLoading,
      canLoadOlderMessages,
      canLoadOlderChatMessages,
      batches,
      canSend,
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
