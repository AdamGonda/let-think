import { type ReactNode, useEffect, useMemo } from "react";
import { useConvex } from "convex/react";
import { useMachine } from "@xstate/react";
import { AppUiActorContext } from "./appUiActorContext";
import { appUiMachine } from "../machines/appUiMachine";
import { createPublishConfirmMutationActor } from "../machines/publishConfirmMutationActor";
import {
  getStoredAppUiSelection,
  setStoredAppUiSelection,
} from "@/lib/appUiStorage";

export function AppUiProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const initialSelection = useMemo(() => getStoredAppUiSelection(), []);
  const machineWithActors = useMemo(
    () =>
      appUiMachine.provide({
        actors: {
          publishConfirmMutation: createPublishConfirmMutationActor(convex),
        },
      }),
    [convex],
  );
  const [, , actorRef] = useMachine(machineWithActors, {
    input: initialSelection,
  });

  useEffect(() => {
    const subscription = actorRef.subscribe((snapshot) => {
      setStoredAppUiSelection({
        activeSessionId: snapshot.context.activeSessionId,
        activeProjectId: snapshot.context.activeProjectId,
        hasEverHadSessionSelection: snapshot.context.hasEverHadSessionSelection,
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
