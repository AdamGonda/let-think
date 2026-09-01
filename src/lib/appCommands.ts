import type { SessionView, SurfaceMode } from "@/machines/appUiTypes";
import {
  EDITOR_FOLD_ALL_HEADINGS_EVENT,
  EDITOR_UNFOLD_ALL_EVENT,
} from "@/components/editor/headingFold";

export type CommandContext = {
  editorOpen: boolean;
  sessionView: SessionView;
  surfaceMode: SurfaceMode;
};

export type AppCommand = {
  id: string;
  label: string;
  keywords?: string;
  /** When omitted, the command is available everywhere. */
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void;
};

export function visibleCommands(
  commands: AppCommand[],
  ctx: CommandContext,
): AppCommand[] {
  return commands.filter((command) => command.when?.(ctx) ?? true);
}

export function filterCommands(
  commands: AppCommand[],
  query: string,
): AppCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((command) => {
    const hay = `${command.label} ${command.keywords ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function isCommandPaletteHotkey(event: {
  code: string;
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
  isComposing: boolean;
}): boolean {
  if (event.repeat || event.isComposing || event.altKey) return false;
  if (!event.shiftKey) return false;
  if (!event.metaKey && !event.ctrlKey) return false;
  return event.code === "KeyP" || event.key.toLowerCase() === "p";
}

/**
 * App-wide command list. Add entries here; gate with `when` for the
 * current surface (editor, graph, canvas, files).
 */
export const appCommands: AppCommand[] = [
  {
    id: "editor.foldAllHeadings",
    label: "Fold all headings",
    keywords: "collapse sections markdown # ##",
    when: (ctx) => ctx.editorOpen,
    run: () => {
      window.dispatchEvent(new Event(EDITOR_FOLD_ALL_HEADINGS_EVENT));
    },
  },
  {
    id: "editor.unfoldAll",
    label: "Unfold all headings",
    keywords: "expand sections unfold",
    when: (ctx) => ctx.editorOpen,
    run: () => {
      window.dispatchEvent(new Event(EDITOR_UNFOLD_ALL_EVENT));
    },
  },
];
