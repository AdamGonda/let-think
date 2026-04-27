import type { RefObject } from "react";
import { MoreHorizontal } from "lucide-react";
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
      <button
        type="button"
        className="m-0 flex h-full w-full cursor-pointer appearance-none items-center gap-3 rounded-md border-0 bg-transparent px-2 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label="Open account menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls="user-card-menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <UserAvatar
          imageUrl={user.image}
          name={user.name}
          email={user.email}
          size="default"
          className="after:hidden"
        />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Beta {__APP_VERSION__}
          </p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground">
          <MoreHorizontal className="size-4" />
        </span>
      </button>
    </UserCardMenuShell>
  );
}
