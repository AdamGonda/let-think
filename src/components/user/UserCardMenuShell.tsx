import type { RefObject, ReactNode } from "react";
import { UserMenuPanel } from "./UserMenuPanel";
import { cn } from "@/lib/utils";

type UserCardMenuShellProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
  children: ReactNode;
};

/**
 * Header dropdown for the account menu (SRP: layout/animation only).
 */
export function UserCardMenuShell({
  containerRef,
  menuOpen,
  setMenuOpen,
  signOut,
  onRunTutorial,
  children,
}: UserCardMenuShellProps) {
  return (
    <div ref={containerRef} className="relative shrink-0">
      {children}
      <div
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-56 origin-top transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
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
