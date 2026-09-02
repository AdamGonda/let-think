import { type ReactNode, useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { AppUiActorContext } from "./appUiActorContext";
import { appUiMachine } from "../machines/appUiMachine";
import {
  getStoredAppUiSelection,
  setStoredAppUiSelection,
} from "@/lib/appUiStorage";

export function AppUiProvider({ children }: { children: ReactNode }) {
  const initialSelection = useMemo(() => getStoredAppUiSelection(), []);
  const [, , actorRef] = useMachine(appUiMachine, {
    input: initialSelection,
  });

  // Parallel `surface` always starts at notesList; sync once from stored mode.
  useEffect(() => {
    if (initialSelection.surfaceMode === "graph") {
      actorRef.send({ type: "VIEW_SET", mode: "graph" });
    }
  }, [actorRef, initialSelection.surfaceMode]);

  useEffect(() => {
    const subscription = actorRef.subscribe((snapshot) => {
      setStoredAppUiSelection({
        activeFileId: snapshot.context.activeFileId,
        activeChatSessionId: snapshot.context.activeChatSessionId,
        activeSessionId: snapshot.context.activeSessionId,
        activeProjectId: snapshot.context.activeProjectId,
        hasEverHadSessionSelection: snapshot.context.hasEverHadSessionSelection,
        sessionView: snapshot.context.sessionView,
        surfaceMode: snapshot.context.surfaceMode,
        notesListDrill: snapshot.context.notesListDrill,
        editorOpen: snapshot.context.editorOpen,
        selectedBatchIndex: snapshot.context.selectedBatchIndex,
        prevBatchesLength: snapshot.context.prevBatchesLength,
      });
    });
    return () => subscription.unsubscribe();
  }, [actorRef]);

  return (
    <AppUiActorContext.Provider value={actorRef}>
      {children}
    </AppUiActorContext.Provider>
  );
}
