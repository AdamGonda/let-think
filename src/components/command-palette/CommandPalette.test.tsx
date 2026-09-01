import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandPalettePanel } from "./CommandPalette";
import type { AppCommand, CommandContext } from "@/lib/appCommands";

const ctx: CommandContext = {
  editorOpen: true,
  sessionView: "graph",
  surfaceMode: "notesList",
};

afterEach(cleanup);

describe("CommandPalettePanel", () => {
  it("runs the selected command on enter and click", () => {
    const runFold = vi.fn();
    const runUnfold = vi.fn();
    const onOpenChange = vi.fn();
    const commands: AppCommand[] = [
      { id: "fold", label: "Fold all headings", run: runFold },
      { id: "unfold", label: "Unfold all headings", run: runUnfold },
    ];
    render(
      <CommandPalettePanel
        open
        onOpenChange={onOpenChange}
        commands={commands}
        context={ctx}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(runFold).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.click(screen.getByRole("option", { name: "Unfold all headings" }));
    expect(runUnfold).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters the list as you type", () => {
    render(
      <CommandPalettePanel
        open
        onOpenChange={vi.fn()}
        commands={[
          { id: "fold", label: "Fold all headings", run: vi.fn() },
          { id: "canvas", label: "Clear canvas", run: vi.fn() },
        ]}
        context={ctx}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "fold" },
    });
    expect(screen.getByRole("option", { name: "Fold all headings" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Clear canvas" })).toBeNull();
  });
});
