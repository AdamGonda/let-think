import { useContext } from "react";
import { useSelector } from "@xstate/react";
import {
  AppUiActorContext,
  type AppUiActorRef,
} from "../contexts/appUiActorContext";

export function useAppUiActor(): AppUiActorRef {
  const actor = useContext(AppUiActorContext);
  if (actor == null) {
    throw new Error("useAppUiActor must be used within AppUiProvider");
  }
  return actor;
}

export function useAppUiSelector<T>(
  selector: (snapshot: ReturnType<AppUiActorRef["getSnapshot"]>) => T,
  compare?: (a: T, b: T) => boolean,
): T {
  const actor = useAppUiActor();
  return useSelector(actor, selector, compare);
}
