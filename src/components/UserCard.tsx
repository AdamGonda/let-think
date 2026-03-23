import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useWorkPreference } from "../hooks/useWorkPreference";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserCardModeToggle } from "./UserCardModeToggle";
import { UserMenuPanel } from "./UserMenuPanel";

function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

interface UserCardProps {
  compact?: boolean;
  onRunTutorial?: () => void;
}

export function UserCard({
  compact = false,
  onRunTutorial,
}: UserCardProps) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const { isWorkMode, setMode } = useWorkPreference();
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleWorkMode = () => {
    setMode(isWorkMode ? "think" : "work");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when avatar URL changes
    setImageError(false);
  }, [user?.image]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  if (!user) return null;

  const initials = getInitials(user.name ?? user.email ?? undefined);
  const displayName = user.name ?? user.email ?? "User";

  const avatar = (
    <Avatar size="lg" className="size-10">
      {user.image && !imageError ? (
        <AvatarImage
          src={user.image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const slideEase =
    "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform";

  if (compact) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden transition-[min-height] duration-200 ease-out",
          menuOpen ? "min-h-[180px]" : "min-h-14",
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex justify-center py-1",
            slideEase,
            menuOpen ? "-translate-y-full pointer-events-none" : "translate-y-0",
          )}
        >
          <button
            type="button"
            className="flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Open account menu (${isWorkMode ? "Fast" : "Deep"} mode)`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="user-card-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="relative inline-flex">
              {avatar}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-background"
                style={{ backgroundColor: "var(--session-accent)" }}
                title={isWorkMode ? "Fast mode" : "Deep mode"}
              >
                {isWorkMode ? "F" : "D"}
              </span>
            </span>
          </button>
        </div>
        <div
          className={cn(
            "absolute inset-x-0 top-0 py-0.5",
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full min-w-0 overflow-hidden transition-[min-height] duration-200 ease-out",
        menuOpen ? "min-h-[145px]" : "min-h-18",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 py-2",
          slideEase,
          menuOpen ? "-translate-y-full pointer-events-none" : "translate-y-0",
        )}
      >
        {avatar}
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <UserCardModeToggle
              isWorkMode={isWorkMode}
              onToggle={toggleWorkMode}
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">Free plan</p>
        </div>
        <div className="shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open account menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="user-card-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "absolute inset-x-0 top-0 py-1",
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
