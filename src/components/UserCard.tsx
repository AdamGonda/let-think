import { useState, useEffect, useRef } from "react";
import { useDismissOnOutsideAndEscape } from "../hooks/useDismissOnOutsideAndEscape";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useWorkPreference } from "../hooks/useWorkPreference";
import { UserCardCompact } from "./UserCardCompact";
import { UserCardExpanded } from "./UserCardExpanded";

interface UserCardProps {
  compact?: boolean;
  /** When true (e.g. sidebar collapsed), profile does not open the account menu. */
  menuDisabled?: boolean;
  onRunTutorial?: () => void;
}

export function UserCard({
  compact = false,
  menuDisabled = false,
  onRunTutorial,
}: UserCardProps) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const { isWorkMode, setMode } = useWorkPreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleWorkMode = () => {
    setMode(isWorkMode ? "think" : "work");
  };

  useDismissOnOutsideAndEscape(containerRef, menuOpen, () =>
    setMenuOpen(false),
  );

  useEffect(() => {
    if (!menuDisabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu when profile cannot open (e.g. collapsed sidebar)
    setMenuOpen(false);
  }, [menuDisabled]);

  if (!user) return null;

  const displayName = user.name ?? user.email ?? "User";

  if (compact) {
    return (
      <UserCardCompact
        user={user}
        containerRef={containerRef}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuDisabled={menuDisabled}
        isWorkMode={isWorkMode}
        signOut={signOut}
        onRunTutorial={onRunTutorial}
      />
    );
  }

  return (
    <UserCardExpanded
      user={user}
      displayName={displayName}
      containerRef={containerRef}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      isWorkMode={isWorkMode}
      onToggleWorkMode={toggleWorkMode}
      signOut={signOut}
      onRunTutorial={onRunTutorial}
    />
  );
}
