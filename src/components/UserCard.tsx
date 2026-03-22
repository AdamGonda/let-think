import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, MoreHorizontal, HelpCircle } from "lucide-react";
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

interface UserCardProps {
  compact?: boolean;
  onRunTutorial?: () => void;
  activeSessionId?: Id<"sessions"> | null;
}

function UserMenu({
  open,
  onClose,
  anchorRef,
  compact,
  signOut,
  onRunTutorial,
  sessionRestrictEnabled,
  sessionRestrictDisabled,
  onToggleSessionRestrict,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  compact: boolean;
  signOut: () => void;
  onRunTutorial?: () => void;
  sessionRestrictEnabled: boolean;
  sessionRestrictDisabled: boolean;
  onToggleSessionRestrict: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (
        menu &&
        !menu.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !anchorRef.current || typeof document === "undefined")
    return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const style: React.CSSProperties = compact
    ? {
        position: "fixed",
        left: rect.right + 8,
        top: rect.top,
        zIndex: 10000,
      }
    : {
        position: "fixed",
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.top + 8,
        zIndex: 10000,
      };

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";

  const content = (
    <div
      ref={menuRef}
      role="menu"
      className="min-w-[260px] overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={style}
    >
      <div
        role="presentation"
        className={cn(
          "flex w-full items-center rounded-md px-1.5 py-2.5 text-sm transition-colors",
          sessionRestrictDisabled ? "opacity-50" : "hover:bg-accent/60",
        )}
      >
        <div className="flex w-full items-center gap-2 px-0.5">
          <span className="shrink-0 font-medium leading-snug text-foreground">
            Mode:
          </span>
          <Switch
            checked={sessionRestrictEnabled}
            disabled={sessionRestrictDisabled}
            onCheckedChange={(next) => {
              if (sessionRestrictDisabled) return;
              if (next !== sessionRestrictEnabled) onToggleSessionRestrict();
            }}
            internalLabel={{ off: "Think", on: "Work" }}
            offTrackClassName="bg-[#1447E6]"
            onTrackClassName="bg-[#059669]"
            aria-label={
              sessionRestrictEnabled
                ? "Mode: Work (productivity)"
                : "Mode: Think (thinking)"
            }
            className="shrink-0 ring-offset-popover"
          />
        </div>
      </div>
      {onRunTutorial && (
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
      )}
      <div className="my-1 h-px bg-border" role="separator" />
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

  return createPortal(content, document.body);
}

export function UserCard({
  compact = false,
  onRunTutorial,
  activeSessionId = null,
}: UserCardProps) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);
  const interactionState = useQuery(
    api.interactionSessions.get,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const setInteractionRestriction = useMutation(
    api.sessions.setInteractionRestriction,
  );
  const sessionRestrictEnabled = interactionState?.mode === "restrict";
  const sessionRestrictDisabled = activeSessionId == null;

  const onToggleSessionRestrict = () => {
    if (!activeSessionId) return;
    void setInteractionRestriction({
      sessionId: activeSessionId,
      mode: sessionRestrictEnabled ? "open" : "restrict",
    });
  };

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

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

  if (compact) {
    return (
      <div className="flex flex-col items-center py-2">
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement | null>}
          type="button"
          className="flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {avatar}
        </button>
        <UserMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={triggerRef}
          compact={true}
          signOut={signOut}
          onRunTutorial={onRunTutorial}
          sessionRestrictEnabled={sessionRestrictEnabled}
          sessionRestrictDisabled={sessionRestrictDisabled}
          onToggleSessionRestrict={onToggleSessionRestrict}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full min-w-0 py-2">
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">Free plan</p>
      </div>
      <div ref={triggerRef as React.RefObject<HTMLDivElement | null>} className="shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
      <UserMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={triggerRef}
        compact={false}
        signOut={signOut}
        onRunTutorial={onRunTutorial}
        sessionRestrictEnabled={sessionRestrictEnabled}
        sessionRestrictDisabled={sessionRestrictDisabled}
        onToggleSessionRestrict={onToggleSessionRestrict}
      />
    </div>
  );
}
