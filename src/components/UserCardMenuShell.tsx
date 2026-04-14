import type { RefObject, ReactNode } from "react";
import { UserMenuPanel } from "./UserMenuPanel";
import { cn } from "@/lib/utils";

const slideEase =
  "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform";

type UserCardMenuShellProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
  /** Top row (avatar / expanded header) — slides up when menu opens */
  children: ReactNode;
  variant: "compact" | "expanded";
};

const shellByVariant = {
  compact: {
    container: "relative w-full min-w-0 max-w-full transition-[min-height] duration-200 ease-out",
    openMinH: "min-h-[220px] overflow-hidden",
    closedMinH: "min-h-14 overflow-hidden",
    headerRow: "absolute inset-x-0 top-0 flex justify-center py-1",
    menuWrap: "absolute inset-x-0 top-0 py-0.5",
  },
  expanded: {
    container: "relative w-full min-w-0 overflow-hidden transition-[min-height] duration-200 ease-out",
    openMinH: "min-h-[185px]",
    closedMinH: "min-h-14",
    headerRow: "absolute inset-x-0 top-0 flex items-center gap-3 pt-2 pb-1",
    menuWrap: "absolute inset-x-0 top-0 py-1",
  },
} as const;

/**
 * Shared slide transition for the account menu panel (SRP: layout/animation only).
 */
export function UserCardMenuShell({
  containerRef,
  menuOpen,
  setMenuOpen,
  signOut,
  onRunTutorial,
  children,
  variant,
}: UserCardMenuShellProps) {
  const s = shellByVariant[variant];

  return (
    <div
      ref={containerRef}
      className={cn(
        s.container,
        menuOpen ? s.openMinH : s.closedMinH,
      )}
    >
      <div
        className={cn(
          s.headerRow,
          slideEase,
          menuOpen ? "-translate-y-full pointer-events-none" : "translate-y-0",
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          s.menuWrap,
          slideEase,
          menuOpen
            ? "translate-y-0"
            : "translate-y-full pointer-events-none opacity-0",
        )}
      >
        <UserMenuPanel
          onClose={() => setMenuOpen(false)}
          signOut={signOut}
          onRunTutorial={onRunTutorial}
        />
      </div>
    </div>
  );
}
