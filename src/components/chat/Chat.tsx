import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSessionData } from "../../contexts/SessionDataContext";
import { formatBreakCountdown } from "../../lib/formatBreakCountdown";
import {
  resolveAtReferences,
  type Mention,
} from "../../lib/chatMentions";
import type { NumberedConcept } from "../../lib/conceptReferences";
import { ChatComposer } from "./ChatComposer";

export type { Mention };

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  onCreateSession?: () => Promise<Id<"sessions">>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  numberedConcepts?: NumberedConcept[];
  draftInput?: string;
  setDraftInput?: (value: string) => void;
  onModelResponded?: () => void;
  workModeLoadingFrame?: boolean;
}

export function Chat({
  sessionId,
  onCreateSession,
  isLoading,
  setIsLoading,
  numberedConcepts = [],
  draftInput,
  setDraftInput,
  onModelResponded,
  workModeLoadingFrame = false,
}: ChatProps) {
  const [internalInput, setInternalInput] = useState("");
  const input = draftInput !== undefined ? draftInput : internalInput;
  const setInput =
    setDraftInput !== undefined ? setDraftInput : setInternalInput;
  const sendMessage = useAction(api.chat.send);
  const recordInteraction = useMutation(api.interactionSessions.recordInteraction);
  const {
    canSend,
    remaining,
    breakRemainingMs,
    onInteractionComplete,
    startBreakOptimistically,
    interactionRestriction,
    interactionCountsPending,
  } = useSessionData();
  const restrictInteractions = interactionRestriction === "restrict";
  const breakRemainingFormatted =
    breakRemainingMs != null && breakRemainingMs > 0
      ? formatBreakCountdown(breakRemainingMs)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setInput("");
    if (restrictInteractions && remaining === 1) {
      startBreakOptimistically();
    }
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
      if (restrictInteractions) {
        if (createdViaCallback) {
          await recordInteraction({});
        } else {
          await onInteractionComplete();
        }
      }
      setIsLoading(false);
      onModelResponded?.();
    } catch (err) {
      console.error("Chat error:", err);
      setInput(rawContent);
      setIsLoading(false);
    }
  };

  const canSubmit = sessionId ? canSend : !!onCreateSession;
  const isDisabled = isLoading || !canSubmit;

  const placeholder =
    breakRemainingFormatted
      ? `Wake up in ${breakRemainingFormatted}`
      : sessionId || onCreateSession
        ? numberedConcepts.length > 0
          ? "Type, @ ref concepts"
          : "Type..."
        : "Select a session to start";

  const showInteractionLine =
    restrictInteractions &&
    sessionId &&
    breakRemainingMs === null &&
    (remaining != null || interactionCountsPending);

  const showUnlimitedInteractionLine =
    !restrictInteractions && sessionId && breakRemainingMs === null;

  return (
    <ChatComposer
      input={input}
      setInput={setInput}
      placeholder={placeholder}
      numberedConcepts={numberedConcepts}
      isDisabled={isDisabled}
      isLoading={isLoading}
      workModeLoadingFrame={workModeLoadingFrame}
      showInteractionLine={!!showInteractionLine}
      showUnlimitedInteractionLine={!!showUnlimitedInteractionLine}
      remaining={remaining}
      interactionCountsPending={interactionCountsPending}
      onSubmit={handleSubmit}
    />
  );
}
