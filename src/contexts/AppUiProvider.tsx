import { type ReactNode } from "react";
import { useMachine } from "@xstate/react";
import { AppUiActorContext } from "./appUiActorContext";
import { appUiMachine } from "../machines/appUiMachine";

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [, , actorRef] = useMachine(appUiMachine);
  return (
    <AppUiActorContext.Provider value={actorRef}>
      {children}
    </AppUiActorContext.Provider>
  );
}
