import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
    container: "relative w-full min-w-0 max-w-full overflow-hidden transition-[height] duration-200 ease-out",
    headerRow: "absolute inset-x-0 top-0 flex justify-center py-1",
    menuWrap: "absolute inset-x-0 top-0 py-0.5",
  },
  expanded: {
    container: "relative w-full min-w-0 overflow-hidden transition-[height] duration-200 ease-out",
    headerRow: "absolute inset-x-0 top-0 h-14",
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
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = useState(56);
  const closedHeight = 56;

  useEffect(() => {
    const node = menuWrapRef.current;
    if (!node) return;
    const updateHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setMenuHeight(nextHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={s.container}
      style={{ height: menuOpen ? Math.max(menuHeight, closedHeight) : closedHeight }}
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
        ref={menuWrapRef}
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
