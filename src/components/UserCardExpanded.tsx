import type { RefObject } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatarWithModeAccent } from "./ProfileAvatarWithModeAccent";
import { UserCardModeToggle } from "./UserCardModeToggle";
import { UserMenuPanel } from "./UserMenuPanel";
import { cn } from "@/lib/utils";

type UserLike = {
  image?: string | null;
  name?: string | null;
  email?: string | null;
};

type UserCardExpandedProps = {
  user: UserLike;
  displayName: string;
  containerRef: RefObject<HTMLDivElement | null>;
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  isWorkMode: boolean;
  onToggleWorkMode: () => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
};

const slideEase =
  "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform";

export function UserCardExpanded({
  user,
  displayName,
  containerRef,
  menuOpen,
  setMenuOpen,
  isWorkMode,
  onToggleWorkMode,
  signOut,
  onRunTutorial,
}: UserCardExpandedProps) {
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full min-w-0 overflow-hidden transition-[min-height] duration-200 ease-out",
        menuOpen ? "min-h-[145px]" : "min-h-14",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 pt-2 pb-1",
          slideEase,
          menuOpen ? "-translate-y-full pointer-events-none" : "translate-y-0",
        )}
      >
        <ProfileAvatarWithModeAccent
          imageUrl={user.image}
          name={user.name}
          email={user.email}
        />
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <UserCardModeToggle
              isWorkMode={isWorkMode}
              onToggle={onToggleWorkMode}
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
