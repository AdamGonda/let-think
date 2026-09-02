import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { layout } from "@/config";
import { cn } from "@/lib/utils";
import { useAppUiSelector } from "@/hooks/useAppUi";
import {
  appCommands,
  filterCommands,
  isCommandPaletteHotkey,
  visibleCommands,
  type AppCommand,
  type CommandContext,
} from "@/lib/appCommands";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const editorOpen = useAppUiSelector((s) => s.context.editorOpen);
  const sessionView = useAppUiSelector((s) => s.context.sessionView);
  const surfaceMode = useAppUiSelector((s) => s.context.surfaceMode);
  const context = useMemo<CommandContext>(
    () => ({ editorOpen, sessionView, surfaceMode }),
    [editorOpen, sessionView, surfaceMode],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandPaletteHotkey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <CommandPalettePanel
      open={open}
      onOpenChange={setOpen}
      commands={appCommands}
      context={context}
    />
  );
}

export function CommandPalettePanel({
  open,
  onOpenChange,
  commands,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: AppCommand[];
  context: CommandContext;
}) {
  if (!open) return null;
  return (
    <CommandPaletteOpen
      onOpenChange={onOpenChange}
      commands={commands}
      context={context}
    />
  );
}

function CommandPaletteOpen({
  onOpenChange,
  commands,
  context,
}: {
  onOpenChange: (open: boolean) => void;
  commands: AppCommand[];
  context: CommandContext;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = useMemo(
    () => filterCommands(visibleCommands(commands, context), query),
    [commands, context, query],
  );
  const availableCount = useMemo(
    () => visibleCommands(commands, context).length,
    [commands, context],
  );
  const safeIndex =
    items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1);
  const active = items[safeIndex];

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onOpenChange]);

  const runSelected = (command: AppCommand | undefined) => {
    if (!command) return;
    command.run(context);
    onOpenChange(false);
  };

  return createPortal(
    <div className={cn("fixed inset-0", layout.commandPaletteZIndexClass)}>
      <button
        type="button"
        aria-label="Dismiss command palette"
        className="absolute inset-0 bg-black/40 supports-backdrop-filter:backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-slot="command-palette"
        className="absolute top-[12vh] left-1/2 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      >
        <input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={
            active ? `${listId}-${active.id}` : undefined
          }
          placeholder="Type a command…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (items.length === 0) return;
              setSelectedIndex((index) => (index + 1) % items.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (items.length === 0) return;
              setSelectedIndex(
                (index) => (index - 1 + items.length) % items.length,
              );
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              runSelected(active);
            }
          }}
          className="h-12 w-full border-0 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground"
        />
        <div className="h-px bg-border" />
        <ul
          id={listId}
          role="listbox"
          className="max-h-[min(20rem,50vh)] overflow-y-auto p-1"
        >
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {availableCount === 0
                ? "No commands in this view"
                : "No matching commands"}
            </li>
          ) : (
            items.map((command, index) => {
              const selected = index === safeIndex;
              return (
                <li
                  key={command.id}
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => runSelected(command)}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2 text-sm",
                    selected
                      ? "bg-muted text-foreground"
                      : "text-foreground/90",
                  )}
                >
                  {command.label}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
