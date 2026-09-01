import { describe, expect, it, vi } from "vitest";
import {
  appCommands,
  filterCommands,
  isCommandPaletteHotkey,
  visibleCommands,
  type AppCommand,
  type CommandContext,
} from "./appCommands";
import {
  EDITOR_FOLD_ALL_HEADINGS_EVENT,
  EDITOR_UNFOLD_ALL_EVENT,
} from "@/components/editor/headingFold";

const editorCtx: CommandContext = {
  editorOpen: true,
  sessionView: "graph",
  surfaceMode: "notesList",
};

const filesCtx: CommandContext = {
  editorOpen: false,
  sessionView: "graph",
  surfaceMode: "notesList",
};

function hotkey(
  over: Partial<Parameters<typeof isCommandPaletteHotkey>[0]> = {},
): Parameters<typeof isCommandPaletteHotkey>[0] {
  return {
    code: "KeyP",
    key: "p",
    metaKey: true,
    ctrlKey: false,
    shiftKey: true,
    altKey: false,
    repeat: false,
    isComposing: false,
    ...over,
  };
}

describe("command palette matching", () => {
  it("shows editor fold commands only while the note editor is open", () => {
    const open = visibleCommands(appCommands, editorCtx).map((c) => c.id);
    const closed = visibleCommands(appCommands, filesCtx);
    expect(open).toContain("editor.foldAllHeadings");
    expect(open).toContain("editor.unfoldAll");
    expect(closed).toEqual([]);
  });

  it("filters by label and keywords", () => {
    const fold = filterCommands(appCommands, "fold");
    const hash = filterCommands(appCommands, "##");
    const miss = filterCommands(appCommands, "canvas");
    expect(fold.map((c) => c.id)).toEqual([
      "editor.foldAllHeadings",
      "editor.unfoldAll",
    ]);
    expect(hash.map((c) => c.id)).toEqual(["editor.foldAllHeadings"]);
    expect(miss).toEqual([]);
  });
});

describe("command palette hotkey", () => {
  it("matches cmd/ctrl+shift+p and ignores other modifiers", () => {
    expect(isCommandPaletteHotkey(hotkey())).toBe(true);
    expect(isCommandPaletteHotkey(hotkey({ metaKey: false, ctrlKey: true }))).toBe(
      true,
    );
    expect(isCommandPaletteHotkey(hotkey({ shiftKey: false }))).toBe(false);
    expect(isCommandPaletteHotkey(hotkey({ altKey: true }))).toBe(false);
    expect(isCommandPaletteHotkey(hotkey({ code: "KeyK", key: "k" }))).toBe(
      false,
    );
  });
});

describe("editor fold commands", () => {
  it("dispatches fold and unfold events", () => {
    const fold = vi.fn();
    const unfold = vi.fn();
    window.addEventListener(EDITOR_FOLD_ALL_HEADINGS_EVENT, fold);
    window.addEventListener(EDITOR_UNFOLD_ALL_EVENT, unfold);
    const commands = appCommands as AppCommand[];
    commands.find((c) => c.id === "editor.foldAllHeadings")?.run(editorCtx);
    commands.find((c) => c.id === "editor.unfoldAll")?.run(editorCtx);
    expect(fold).toHaveBeenCalledTimes(1);
    expect(unfold).toHaveBeenCalledTimes(1);
    window.removeEventListener(EDITOR_FOLD_ALL_HEADINGS_EVENT, fold);
    window.removeEventListener(EDITOR_UNFOLD_ALL_EVENT, unfold);
  });
});
