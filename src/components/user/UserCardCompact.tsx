import type { RefObject } from "react";
import { UserAvatar } from "./UserAvatar";
import { UserCardMenuShell } from "./UserCardMenuShell";

type UserLike = {
  image?: string | null;
  name?: string | null;
  email?: string | null;
};

type UserCardCompactProps = {
  user: UserLike;
  containerRef: RefObject<HTMLDivElement | null>;
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  menuDisabled: boolean;
  /** When menu is disabled, optional handler so the avatar can still do something (e.g. expand sidebar). */
  onExpandSidebar?: () => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
};

export function UserCardCompact({
  user,
  containerRef,
  menuOpen,
  setMenuOpen,
  menuDisabled,
  onExpandSidebar,
  signOut,
  onRunTutorial,
}: UserCardCompactProps) {
  return (
    <UserCardMenuShell
      containerRef={containerRef}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      signOut={signOut}
      onRunTutorial={onRunTutorial}
      variant="compact"
    >
      {menuDisabled ? (
        onExpandSidebar ? (
          <button
            type="button"
            className="flex max-w-full cursor-pointer items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            aria-label="Expand sidebar"
            onClick={onExpandSidebar}
          >
            <UserAvatar
              imageUrl={user.image}
              name={user.name}
              email={user.email}
              size="default"
              className="after:hidden"
            />
          </button>
        ) : (
          <div
            className="flex cursor-default items-center justify-center rounded-md"
            aria-label="Account. Expand the sidebar to open the menu."
            role="group"
          >
            <UserAvatar
              imageUrl={user.image}
              name={user.name}
              email={user.email}
              size="default"
              className="after:hidden"
            />
          </div>
        )
      ) : (
        <button
          type="button"
          className="flex max-w-full items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
        </button>
      )}
    </UserCardMenuShell>
  );
}
