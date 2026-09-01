import type { ReactNode } from "react";

type AppShellProps = {
  wakeUpOverlay: ReactNode;
  tutorial: ReactNode;
  /** When true, main workspace is non-interactive (wake-up layer visible). */
  mainInert: boolean;
  children: ReactNode;
  toaster: ReactNode;
  commandPalette: ReactNode;
};

export function AppShell({
  wakeUpOverlay,
  tutorial,
  mainInert,
  children,
  toaster,
  commandPalette,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {wakeUpOverlay}
      {tutorial}
      <div className="flex flex-1 min-w-0" inert={mainInert}>
        {children}
      </div>
      {toaster}
      {commandPalette}
    </div>
  );
}
