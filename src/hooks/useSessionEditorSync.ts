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
 * Keeps graph draft, chat draft, and thinking notes in sync with Convex.
 */
export function useSessionEditorSync(
  activeSessionId: Id<"sessions"> | null,
  activeFileId: Id<"files"> | null,
  activeChatSessionId: Id<"chatSessions"> | null,
) {
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

  const storedFile = useQuery(
    api.files.getEditorFields,
    activeFileId ? { fileId: activeFileId } : "skip",
  );
  const storedChatDraft = useQuery(
    api.chatSessions.getDraft,
    activeChatSessionId ? { chatSessionId: activeChatSessionId } : "skip",
  );

  const storedDraft = storedFile?.draftInput;
  const storedThinkingNotes = storedFile?.thinkingNotes;

  const updateDraft = useMutation(api.sessions.updateDraft);
  const updateChatDraft = useMutation(api.chatSessions.updateDraft);
  const updateFileNotes = useMutation(api.files.updateThinkingNotes);

  const prevSessionIdRef = useRef<Id<"sessions"> | null>(null);
  const prevFileIdRef = useRef<Id<"files"> | null>(null);
  const prevChatSessionIdRef = useRef<Id<"chatSessions"> | null>(null);
  const appliedStoredForSessionRef = useRef<Id<"sessions"> | null>(null);
  const appliedStoredForFileRef = useRef<Id<"files"> | null>(null);
  const appliedStoredForChatRef = useRef<Id<"chatSessions"> | null>(null);

  useEffect(() => {
    const prevSession = prevSessionIdRef.current;
    const sessionChanged = prevSession !== activeSessionId;
    if (sessionChanged && prevSession != null) {
      void updateDraft({
        sessionId: prevSession,
        draftInput: draftInputRef.current,
      });
    }
    prevSessionIdRef.current = activeSessionId;

    const storedDraftReady = storedDraft !== undefined;
    if (sessionChanged) {
      appliedStoredForSessionRef.current = null;
      setDraftInput(
        actor,
        activeSessionId == null ? "" : (storedDraft ?? ""),
      );
      if (activeSessionId != null && storedDraftReady) {
        appliedStoredForSessionRef.current = activeSessionId;
      }
    } else if (
      activeSessionId != null &&
      appliedStoredForSessionRef.current !== activeSessionId &&
      storedDraftReady
    ) {
      setDraftInput(actor, storedDraft ?? "");
      appliedStoredForSessionRef.current = activeSessionId;
    }
  }, [activeSessionId, storedDraft, updateDraft, actor]);

  useEffect(() => {
    const prevFile = prevFileIdRef.current;
    const fileChanged = prevFile !== activeFileId;
    if (fileChanged && prevFile != null) {
      void updateFileNotes({
        fileId: prevFile,
        thinkingNotes: notesRef.current,
      });
    }
    prevFileIdRef.current = activeFileId;

    const notesReady = storedThinkingNotes !== undefined;
    if (fileChanged) {
      appliedStoredForFileRef.current = null;
      setWakeNotes(actor, activeFileId == null ? "" : (storedThinkingNotes ?? ""));
      if (activeFileId != null && notesReady) {
        appliedStoredForFileRef.current = activeFileId;
      }
    } else if (
      activeFileId != null &&
      appliedStoredForFileRef.current !== activeFileId &&
      notesReady
    ) {
      setWakeNotes(actor, storedThinkingNotes ?? "");
      appliedStoredForFileRef.current = activeFileId;
    }
  }, [activeFileId, storedThinkingNotes, updateFileNotes, actor]);

  useEffect(() => {
    const prevChat = prevChatSessionIdRef.current;
    const chatChanged = prevChat !== activeChatSessionId;
    if (chatChanged && prevChat != null) {
      void updateChatDraft({
        chatSessionId: prevChat,
        draftInput: chatDraftInputRef.current,
      });
    }
    prevChatSessionIdRef.current = activeChatSessionId;

    const chatReady = storedChatDraft != null;
    if (chatChanged) {
      appliedStoredForChatRef.current = null;
      setChatDraftInput(
        actor,
        activeChatSessionId == null ? "" : (storedChatDraft ?? ""),
      );
      if (activeChatSessionId != null && chatReady) {
        appliedStoredForChatRef.current = activeChatSessionId;
      }
    } else if (
      activeChatSessionId != null &&
      appliedStoredForChatRef.current !== activeChatSessionId &&
      chatReady
    ) {
      setChatDraftInput(actor, storedChatDraft ?? "");
      appliedStoredForChatRef.current = activeChatSessionId;
    }
  }, [activeChatSessionId, storedChatDraft, updateChatDraft, actor]);

  const saveDraft = useCallback(
    (value: string) => {
      if (activeSessionId) {
        void updateDraft({ sessionId: activeSessionId, draftInput: value });
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
      if (activeChatSessionId) {
        void updateChatDraft({
          chatSessionId: activeChatSessionId,
          draftInput: value,
        });
      }
    },
    [activeChatSessionId, updateChatDraft],
  );
  useEffect(() => {
    if (!activeChatSessionId) return;
    const timer = setTimeout(() => {
      saveChatDraft(chatDraftInput);
    }, timings.draftSaveDebounceMs);
    return () => clearTimeout(timer);
  }, [activeChatSessionId, chatDraftInput, saveChatDraft]);

  const saveThinkingNotes = useCallback(
    (value: string) => {
      if (activeFileId) {
        void updateFileNotes({ fileId: activeFileId, thinkingNotes: value });
      }
    },
    [activeFileId, updateFileNotes],
  );
  useEffect(() => {
    if (!activeFileId) return;
    const timer = setTimeout(() => {
      saveThinkingNotes(notes);
    }, timings.draftSaveDebounceMs);
    return () => clearTimeout(timer);
  }, [activeFileId, notes, saveThinkingNotes]);
}
