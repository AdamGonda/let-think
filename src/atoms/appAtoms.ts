import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../components/NotesListPanel";

export const activeSessionIdAtom = atom<Id<"sessions"> | null>(null);

export const activeProjectIdAtom = atom<Id<"projects"> | null>(null);

export const isLoadingAtom = atom(false);

export const modelRespondedAwaitingDismissalAtom = atom(false);

export const overlayDismissedAtom = atom(false);

export const isExitingOverlayAtom = atom(false);

export const editorOpenAtom = atom(false);

export const historyPanelOpenAtom = atom(false);

export const notesListDrillAtom = atom<NotesListDrill>(null);

export const viewModeAtom = atom<"graph" | "notesList">("graph");

export const selectedBatchIndexAtom = atom(0);

export const draftInputAtom = atom("");

export const notesAtom = atom("");
