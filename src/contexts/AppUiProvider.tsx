import { type ReactNode } from "react";
import { useMachine } from "@xstate/react";
import { AppUiActorContext } from "./appUiActorContext";
import { appUiMachine } from "../machines/appUiMachine";
import { readWorkPreference } from "../lib/workPreferenceStorage";
import { useAppUiPreferencePersistence } from "../hooks/useAppUiPreferencePersistence";

function AppUiPreferencePersistence() {
  useAppUiPreferencePersistence();
  return null;
}

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [, , actorRef] = useMachine(appUiMachine, {
    input: { preference: readWorkPreference() },
  });
  return (
    <AppUiActorContext.Provider value={actorRef}>
      <AppUiPreferencePersistence />
      {children}
    </AppUiActorContext.Provider>
  );
}
