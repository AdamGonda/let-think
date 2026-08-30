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

  useEffect(() => {
    const subscription = actorRef.subscribe((snapshot) => {
      setStoredAppUiSelection({
        activeSessionId: snapshot.context.activeSessionId,
        activeProjectId: snapshot.context.activeProjectId,
        hasEverHadSessionSelection: snapshot.context.hasEverHadSessionSelection,
        sessionView: snapshot.context.sessionView,
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
