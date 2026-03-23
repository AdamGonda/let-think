import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import type { NotesListDrill } from "../components/NotesListPanel";

export const activeSessionIdAtom = atom<Id<"sessions"> | null>(null);

export const activeProjectIdAtom = atom<Id<"projects"> | null>(null);

export const notesListDrillAtom = atom<NotesListDrill>(null);

export const selectedBatchIndexAtom = atom(0);

export const draftInputAtom = atom("");

export const notesAtom = atom("");
