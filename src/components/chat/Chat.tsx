import { useState } from "react";
import { useAction } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  useSessionData,
  type SessionMessage,
} from "../../contexts/SessionDataContext";
import {
  resolveAtReferences,
} from "../../lib/chatMentions";
import type { NumberedConcept } from "../../lib/conceptReferences";
import { ChatComposer } from "./ChatComposer";
import { HistoricalBatchPrompt } from "./HistoricalBatchPrompt";

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  onCreateSession?: () => Promise<Id<"sessions">>;
  autoCollapseSignal?: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  numberedConcepts?: NumberedConcept[];
  draftInput?: string;
  setDraftInput?: (value: string) => void;
  sessionLoadingFrame?: boolean;
  sessionPastFrame?: boolean;
  /**
   * When set (non-latest graph batch), shows collapsed read-only prompt with history-style
   * mention rendering instead of the composer.
   */
  lockedHistorical?: Pick<SessionMessage, "content" | "mentions"> | null;
  /** Graph step index; used to reset historical prompt UI when navigating batches. */
  selectedBatchIndex: number;
}

export function Chat({
  sessionId,
  onCreateSession,
  autoCollapseSignal = "",
  isLoading,
  setIsLoading,
  numberedConcepts = [],
  draftInput,
  setDraftInput,
  sessionLoadingFrame = false,
  sessionPastFrame = false,
  lockedHistorical = null,
  selectedBatchIndex,
}: ChatProps) {
  const [internalInput, setInternalInput] = useState("");
  const draft = draftInput !== undefined ? draftInput : internalInput;
  const setInput =
    setDraftInput !== undefined ? setDraftInput : setInternalInput;
  const input = draft;
  const sendMessage = useAction(api.chat.send);
  const { canSend } = useSessionData();
  const posthog = usePostHog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedHistorical) return;
    if (!input.trim()) return;

    let effectiveSessionId = sessionId;
    const createdViaCallback = !sessionId && onCreateSession;
    if (!effectiveSessionId && onCreateSession) {
      effectiveSessionId = await onCreateSession();
    }
    if (!effectiveSessionId) return;
    if (!createdViaCallback && !canSend) return;

    const rawContent = input.trim();
    const { resolvedContent, referencedConcepts, mentions } = resolveAtReferences(
      rawContent,
      numberedConcepts,
    );
    setIsLoading(true);

    try {
      await sendMessage({
        sessionId: effectiveSessionId,
        userContent: resolvedContent,
        selectedNodeContext:
          referencedConcepts.length > 0
            ? referencedConcepts.map(({ id, name, description }) => ({
                id,
                name,
                description,
              }))
            : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      posthog.capture("message_sent", {
        session_id: effectiveSessionId,
        has_concept_references: referencedConcepts.length > 0,
        concept_reference_count: referencedConcepts.length,
        is_new_session: !!createdViaCallback,
      });
      setInput("");
      setIsLoading(false);
    } catch (err) {
      console.error("Chat error:", err);
      posthog.captureException(err);
      setIsLoading(false);
    }
  };

  const canSubmit = sessionId ? canSend : !!onCreateSession;
  const isDisabled = isLoading || !canSubmit;

  const placeholder =
    sessionId || onCreateSession
      ? numberedConcepts.length > 0
        ? "Type, @ ref concepts"
        : "Type..."
      : "Select a session to start";

  if (lockedHistorical) {
    return (
      <HistoricalBatchPrompt
        key={`${sessionId ?? "none"}-${selectedBatchIndex}`}
        content={lockedHistorical.content}
        mentions={lockedHistorical.mentions}
        sessionLoadingFrame={sessionLoadingFrame}
        sessionPastFrame={sessionPastFrame}
        autoCollapseSignal={autoCollapseSignal}
      />
    );
  }

  return (
    <ChatComposer
      input={input}
      setInput={setInput}
      placeholder={placeholder}
      numberedConcepts={numberedConcepts}
      isDisabled={isDisabled}
      isLoading={isLoading}
      sessionLoadingFrame={sessionLoadingFrame}
      sessionPastFrame={sessionPastFrame}
      onSubmit={handleSubmit}
    />
  );
}
