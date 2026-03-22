import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useWorkPreference } from "../contexts/WorkPreferenceContext";
import { LogOut, MoreHorizontal, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

function ModeBadge({
  isWorkMode,
  className,
}: {
  isWorkMode: boolean;
  className?: string;
}) {
  const label = isWorkMode ? "Work" : "Think";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
        className,
      )}
      style={{ backgroundColor: "var(--session-accent)" }}
    >
      {label}
    </span>
  );
}

interface UserCardProps {
  compact?: boolean;
  onRunTutorial?: () => void;
}

type UserMenuPanelProps = {
  onClose: () => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
  isWorkMode: boolean;
  setWorkMode: (work: boolean) => void;
};

function UserMenuPanel({
  onClose,
  signOut,
  onRunTutorial,
  isWorkMode,
  setWorkMode,
}: UserMenuPanelProps) {
  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm outline-none hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground [&_svg]:size-4 [&_svg]:shrink-0";

  return (
    <div
      role="menu"
      id="user-card-menu"
      className="flex w-full flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-1.5"
    >
      <div className="flex w-full items-center border-b border-border/40 pb-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Account
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-sm"
        role="group"
        aria-labelledby="user-card-mode-label"
      >
        <span
          id="user-card-mode-label"
          className="shrink-0 text-muted-foreground"
        >
          Mode
        </span>
        <Switch
          checked={isWorkMode}
          onCheckedChange={(next) => {
            if (next !== isWorkMode) setWorkMode(next);
          }}
          internalLabel={{ off: "Think", on: "Work" }}
          offTrackClassName="bg-[var(--session-accent-think)]"
          onTrackClassName="bg-[var(--session-accent-work)]"
          aria-label={
            isWorkMode
              ? "Work (productivity mode)"
              : "Think (thinking mode)"
          }
          className="shrink-0 ring-offset-background"
        />
      </div>

      {onRunTutorial ? (
        <button
          type="button"
          role="menuitem"
          className={menuItemClass}
          onClick={() => {
            onRunTutorial();
            onClose();
          }}
        >
          <HelpCircle className="size-4" />
          Replay tutorial
        </button>
      ) : null}

      <div className="my-0.5 h-px bg-border/60" role="separator" />

      <button
        type="button"
        role="menuitem"
        className={menuItemClass}
        onClick={() => {
          void signOut();
          onClose();
        }}
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </div>
  );
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

  const setWorkMode = (work: boolean) => {
    setMode(work ? "work" : "think");
  };

  useEffect(() => {
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
          menuOpen ? "min-h-[220px]" : "min-h-14",
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
            aria-label={`Open account menu (${isWorkMode ? "Work" : "Think"} mode)`}
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
                title={isWorkMode ? "Work mode" : "Think mode"}
              >
                {isWorkMode ? "W" : "T"}
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
            isWorkMode={isWorkMode}
            setWorkMode={setWorkMode}
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
        menuOpen ? "min-h-[180px]" : "min-h-18",
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
            <ModeBadge isWorkMode={isWorkMode} />
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
          isWorkMode={isWorkMode}
          setWorkMode={setWorkMode}
        />
      </div>
    </div>
  );
}
