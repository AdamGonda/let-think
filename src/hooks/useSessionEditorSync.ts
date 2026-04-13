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
import { setDraftInput, setWakeNotes } from "@/lib/appUiCommands";

/**
 * Keeps draft + thinking notes in sync with Convex: load on session change,
 * flush previous session on switch, debounced saves while editing.
 */
export function useSessionEditorSync(activeSessionId: Id<"sessions"> | null) {
  const actor = useAppUiActor();
  const draftInput = useAppUiSelector((s) => s.context.draftInput);
  const notes = useAppUiSelector((s) => s.context.notes);

  const draftInputRef = useRef(draftInput);
  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    draftInputRef.current = draftInput;
    notesRef.current = notes;
  });
  const storedEditor = useQuery(
    api.sessions.getEditorFields,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const storedDraft = storedEditor?.draftInput;
  const storedThinkingNotes = storedEditor?.thinkingNotes;
  const updateDraft = useMutation(api.sessions.updateDraft);
  const updateThinkingNotes = useMutation(api.sessions.updateThinkingNotes);
  const prevSessionIdRef = useRef<Id<"sessions"> | null>(null);
  const appliedStoredForSessionRef = useRef<Id<"sessions"> | null>(null);

  useEffect(() => {
    const prevId = prevSessionIdRef.current;
    const sessionChanged = prevId !== activeSessionId;

    if (sessionChanged && prevId != null) {
      updateDraft({ sessionId: prevId, draftInput: draftInputRef.current });
      updateThinkingNotes({
        sessionId: prevId,
        thinkingNotes: notesRef.current,
      });
    }
    prevSessionIdRef.current = activeSessionId;

    if (sessionChanged) {
      appliedStoredForSessionRef.current = null;
      setDraftInput(
        actor,
        activeSessionId == null ? "" : (storedDraft ?? ""),
      );
      setWakeNotes(actor, "");
      if (
        activeSessionId != null &&
        storedDraft !== undefined &&
        storedThinkingNotes !== undefined
      ) {
        appliedStoredForSessionRef.current = activeSessionId;
        setWakeNotes(actor, storedThinkingNotes ?? "");
      }
    } else if (
      activeSessionId != null &&
      appliedStoredForSessionRef.current !== activeSessionId &&
      storedDraft !== undefined &&
      storedThinkingNotes !== undefined
    ) {
      setDraftInput(actor, storedDraft ?? "");
      setWakeNotes(actor, storedThinkingNotes ?? "");
      appliedStoredForSessionRef.current = activeSessionId;
    }
  }, [
    activeSessionId,
    storedDraft,
    storedThinkingNotes,
    updateDraft,
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
