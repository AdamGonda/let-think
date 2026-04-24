import type { RefObject } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { UserCardMenuShell } from "./UserCardMenuShell";

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
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
};

export function UserCardExpanded({
  user,
  displayName,
  containerRef,
  menuOpen,
  setMenuOpen,
  signOut,
  onRunTutorial,
}: UserCardExpandedProps) {
  return (
    <UserCardMenuShell
      containerRef={containerRef}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      signOut={signOut}
      onRunTutorial={onRunTutorial}
      variant="expanded"
    >
      <>
        <UserAvatar
          imageUrl={user.image}
          name={user.name}
          email={user.email}
          size="default"
          className="after:hidden"
        />
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
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
      </>
    </UserCardMenuShell>
  );
}
