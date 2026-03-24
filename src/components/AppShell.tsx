import type { ReactNode } from "react";

type AppShellProps = {
  wakeUpOverlay: ReactNode;
  /** Think-mode empty-session intro; sits under wake-up in z-order. */
  restSessionWalkthrough?: ReactNode;
  tutorial: ReactNode;
  /** When true, main workspace is non-interactive (wake-up layer visible). */
  mainInert: boolean;
  children: ReactNode;
  toaster: ReactNode;
};

export function AppShell({
  wakeUpOverlay,
  restSessionWalkthrough,
  tutorial,
  mainInert,
  children,
  toaster,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {wakeUpOverlay}
      {restSessionWalkthrough}
      {tutorial}
      <div className="flex flex-1 min-w-0" inert={mainInert}>
        {children}
      </div>
      {toaster}
    </div>
  );
}
