import { createContext } from "react";
import type { ActorRefFrom } from "xstate";
import { appUiMachine } from "../machines/appUiMachine";

export type AppUiActorRef = ActorRefFrom<typeof appUiMachine>;

export const AppUiActorContext = createContext<AppUiActorRef | null>(null);
