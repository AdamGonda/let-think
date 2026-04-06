import type { RefObject } from "react";
import { ProfileAvatarWithModeAccent } from "./ProfileAvatarWithModeAccent";
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
  isWorkMode: boolean;
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
  isWorkMode,
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
            <ProfileAvatarWithModeAccent
              imageUrl={user.image}
              name={user.name}
              email={user.email}
            />
          </button>
        ) : (
          <div
            className="flex cursor-default items-center justify-center rounded-md"
            aria-label={`Account (${isWorkMode ? "Focus" : "Rest"} mode). Expand the sidebar to open the menu.`}
            role="group"
          >
            <ProfileAvatarWithModeAccent
              imageUrl={user.image}
              name={user.name}
              email={user.email}
            />
          </div>
        )
      ) : (
        <button
          type="button"
          className="flex max-w-full items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`Open account menu (${isWorkMode ? "Focus" : "Rest"} mode)`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="user-card-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <ProfileAvatarWithModeAccent
            imageUrl={user.image}
            name={user.name}
            email={user.email}
          />
        </button>
      )}
    </UserCardMenuShell>
  );
}
