import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_MESSAGES_PAGE_SIZE, layout, timings } from "@/config";
import { editorScrollThumbLayout } from "@/components/editor/editorScrollThumbLayout";
import { useSessionData } from "@/contexts/SessionDataContext";
import { renderContentWithMentions } from "@/lib/chatHistoryRender";
import { renderChatMarkdown } from "@/lib/chatMarkdown";
import { ConceptGraphEmptyState } from "@/components/concept-graph-overlay/ConceptGraphEmptyState";
import { clsx } from "clsx";
import { isNearBottom } from "./isNearBottom";
import { MessageImageThumbs } from "./MessageImageThumbs";

const PENDING_USER_KEY = "pending-user";

type SessionChatThreadProps = {
  isLoading: boolean;
};

function ChatMarkdown({ content }: { content: string }) {
  const html = useMemo(() => renderChatMarkdown(content), [content]);
  return <div className="chat-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SessionChatThread({ isLoading }: SessionChatThreadProps) {
  const {
    chatMessages,
    pendingChatUser,
    loadOlderChatMessages,
    canLoadOlderChatMessages,
    chatMessagesLoading,
  } = useSessionData();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollThumbRef = useRef<HTMLDivElement | null>(null);
  const hideThumbTimerRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const displayedMessages = useMemo(() => {
    if (!pendingChatUser) return chatMessages;
    return [...chatMessages, { ...pendingChatUser, _id: PENDING_USER_KEY }];
  }, [chatMessages, pendingChatUser]);

  const lastMessage = displayedMessages.at(-1);
  const lastMessageKey = `${lastMessage?._id ?? ""}:${lastMessage?.content ?? ""}`;
  const showThinking =
    isLoading &&
    !(lastMessage?.role === "assistant" && lastMessage.content.trim());

  useEffect(() => {
    return () => window.clearTimeout(hideThumbTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    if (pendingChatUser) stickToBottomRef.current = true;
    const el = scrollerRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lastMessageKey, isLoading, pendingChatUser]);

  const updateScrollThumb = (el: HTMLDivElement) => {
    const thumb = scrollThumbRef.current;
    if (!thumb) return;
    const next = editorScrollThumbLayout(
      el.clientHeight,
      el.scrollHeight,
      el.scrollTop,
    );
    if (!next) {
      thumb.style.transition = "opacity 0.5s ease";
      thumb.style.opacity = "0";
      return;
    }
    thumb.style.height = `${next.height}px`;
    thumb.style.transform = `translateY(${next.top}px)`;
    thumb.style.transition = "opacity 0.12s ease";
    thumb.style.opacity = "1";
    window.clearTimeout(hideThumbTimerRef.current);
    hideThumbTimerRef.current = window.setTimeout(() => {
      thumb.style.transition = "opacity 0.5s ease";
      thumb.style.opacity = "0";
    }, timings.editorScrollbarIdleMs);
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollThumb(el);
    const near = isNearBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    if (near) {
      if (!stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
      stickToBottomRef.current = true;
    } else {
      stickToBottomRef.current = false;
    }
  };

  const empty =
    displayedMessages.length === 0 &&
    !isLoading &&
    !chatMessagesLoading;

  return (
    <div
      className="flex w-full flex-1 min-h-0 items-stretch justify-center"
      data-tour="chat-thread"
    >
      {empty ? (
        <ConceptGraphEmptyState />
      ) : (
        <div
          className={clsx(
            "relative mx-auto flex min-h-0 w-full flex-1 flex-col",
            layout.mainColumnMaxWidthClass,
          )}
        >
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="overlay-scroll flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4"
          >
            {canLoadOlderChatMessages ? (
              <div className="flex justify-center pb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => loadOlderChatMessages(CHAT_MESSAGES_PAGE_SIZE)}
                >
                  Load older messages
                </Button>
              </div>
            ) : null}
            <ul className="mt-auto flex flex-col gap-3 list-none p-0 m-0">
              {displayedMessages.map((msg, index) => {
                const key = msg._id ?? `msg-${index}`;
                const isUser = msg.role === "user";
                if (!isUser && !msg.content.trim()) return null;
                return (
                  <li
                    key={key}
                    className={isUser ? "ml-auto max-w-[min(100%,36rem)]" : "w-full"}
                  >
                    <div
                      className={clsx(
                        "px-4 py-3 text-[1.125rem] leading-relaxed break-words",
                        isUser
                          ? "rounded-2xl rounded-tr-md bg-muted text-foreground border border-border whitespace-pre-wrap"
                          : "text-foreground",
                      )}
                    >
                      {isUser ? (
                        <>
                          {renderContentWithMentions(msg.content, msg.mentions)}
                          {msg.imageUrls?.length ? (
                            <div className="mt-2">
                              <MessageImageThumbs urls={msg.imageUrls} />
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <ChatMarkdown content={msg.content} />
                      )}
                    </div>
                  </li>
                );
              })}
              {showThinking ? (
                <li className="w-full">
                  <div
                    className="flex items-center gap-2 px-4 py-3 text-muted-foreground"
                    role="status"
                    aria-label="Assistant is thinking"
                  >
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-[1.125rem]">Thinking…</span>
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
          <div ref={scrollThumbRef} className="editor-scroll-thumb" aria-hidden />
        </div>
      )}
    </div>
  );
}
