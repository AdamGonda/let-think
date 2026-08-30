import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { timings } from "@/config";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAppUiActor, useAppUiSelector } from "./useAppUi";
import { setChatDraftInput, setDraftInput, setWakeNotes } from "@/lib/appUiCommands";

/**
 * Keeps draft + thinking notes in sync with Convex: load on session change,
 * flush previous session on switch, debounced saves while editing.
 */
export function useSessionEditorSync(activeSessionId: Id<"sessions"> | null) {
  const actor = useAppUiActor();
  const draftInput = useAppUiSelector((s) => s.context.draftInput);
  const chatDraftInput = useAppUiSelector((s) => s.context.chatDraftInput);
  const notes = useAppUiSelector((s) => s.context.notes);

  const draftInputRef = useRef(draftInput);
  const chatDraftInputRef = useRef(chatDraftInput);
  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    draftInputRef.current = draftInput;
    chatDraftInputRef.current = chatDraftInput;
    notesRef.current = notes;
  });
  const storedEditor = useQuery(
    api.sessions.getEditorFields,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const storedDraft = storedEditor?.draftInput;
  const storedChatDraft = storedEditor?.chatDraftInput;
  const storedThinkingNotes = storedEditor?.thinkingNotes;
  const updateDraft = useMutation(api.sessions.updateDraft);
  const updateChatDraft = useMutation(api.sessions.updateChatDraft);
  const updateThinkingNotes = useMutation(api.sessions.updateThinkingNotes);
  const prevSessionIdRef = useRef<Id<"sessions"> | null>(null);
  const appliedStoredForSessionRef = useRef<Id<"sessions"> | null>(null);

  useEffect(() => {
    const prevId = prevSessionIdRef.current;
    const sessionChanged = prevId !== activeSessionId;

    if (sessionChanged && prevId != null) {
      updateDraft({ sessionId: prevId, draftInput: draftInputRef.current });
      updateChatDraft({
        sessionId: prevId,
        chatDraftInput: chatDraftInputRef.current,
      });
      updateThinkingNotes({
        sessionId: prevId,
        thinkingNotes: notesRef.current,
      });
    }
    prevSessionIdRef.current = activeSessionId;

    const storedReady =
      storedDraft !== undefined &&
      storedChatDraft !== undefined &&
      storedThinkingNotes !== undefined;

    if (sessionChanged) {
      appliedStoredForSessionRef.current = null;
      setDraftInput(
        actor,
        activeSessionId == null ? "" : (storedDraft ?? ""),
      );
      setChatDraftInput(
        actor,
        activeSessionId == null ? "" : (storedChatDraft ?? ""),
      );
      setWakeNotes(actor, "");
      if (activeSessionId != null && storedReady) {
        appliedStoredForSessionRef.current = activeSessionId;
        setWakeNotes(actor, storedThinkingNotes ?? "");
      }
    } else if (
      activeSessionId != null &&
      appliedStoredForSessionRef.current !== activeSessionId &&
      storedReady
    ) {
      setDraftInput(actor, storedDraft ?? "");
      setChatDraftInput(actor, storedChatDraft ?? "");
      setWakeNotes(actor, storedThinkingNotes ?? "");
      appliedStoredForSessionRef.current = activeSessionId;
    }
  }, [
    activeSessionId,
    storedDraft,
    storedChatDraft,
    storedThinkingNotes,
    updateDraft,
    updateChatDraft,
    updateThinkingNotes,
    actor,
  ]);

  const saveDraft = useCallback(
    (value: string) => {
      if (activeSessionId) {
        updateDraft({ sessionId: activeSessionId, draftInput: value });
      }
    },
    [activeSessionId, updateDraft],
  );
  useEffect(() => {
    if (!activeSessionId) return;
    const timer = setTimeout(() => {
      saveDraft(draftInput);
    }, timings.draftSaveDebounceMs);
    return () => clearTimeout(timer);
  }, [activeSessionId, draftInput, saveDraft]);

  const saveChatDraft = useCallback(
    (value: string) => {
      if (activeSessionId) {
        updateChatDraft({ sessionId: activeSessionId, chatDraftInput: value });
      }
    },
    [activeSessionId, updateChatDraft],
  );
  useEffect(() => {
    if (!activeSessionId) return;
    const timer = setTimeout(() => {
      saveChatDraft(chatDraftInput);
    }, timings.draftSaveDebounceMs);
    return () => clearTimeout(timer);
  }, [activeSessionId, chatDraftInput, saveChatDraft]);

  const saveThinkingNotes = useCallback(
    (value: string) => {
      if (activeSessionId) {
        updateThinkingNotes({
          sessionId: activeSessionId,
          thinkingNotes: value,
        });
      }
    },
    [activeSessionId, updateThinkingNotes],
  );
  useEffect(() => {
    if (!activeSessionId) return;
    const timer = setTimeout(() => {
      saveThinkingNotes(notes);
    }, timings.draftSaveDebounceMs);
    return () => clearTimeout(timer);
  }, [activeSessionId, notes, saveThinkingNotes]);
}
