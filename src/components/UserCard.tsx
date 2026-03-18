import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Sun, Moon, LogOut, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

interface UserCardProps {
  onToggleTheme: () => void;
  isDark: boolean;
  compact?: boolean;
}

const menuContent = (
  onToggleTheme: () => void,
  isDark: boolean,
  signOut: () => void,
  compact?: boolean
) => (
  <DropdownMenuContent
    side={compact ? "right" : "top"}
    align={compact ? "start" : "end"}
    sideOffset={8}
  >
    <DropdownMenuItem onSelect={() => onToggleTheme()}>
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {isDark ? "Light mode" : "Dark mode"}
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => void signOut()}>
      <LogOut className="size-4" />
      Sign out
    </DropdownMenuItem>
  </DropdownMenuContent>
);

export function UserCard({ onToggleTheme, isDark, compact = false }: UserCardProps) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const [imageError, setImageError] = useState(false);

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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center justify-center rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Open menu"
              >
                {avatar}
              </button>
            }
          />
          {menuContent(onToggleTheme, isDark, signOut, true)}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full min-w-0 py-2">
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">Free plan</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Open menu">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        {menuContent(onToggleTheme, isDark, signOut, false)}
      </DropdownMenu>
    </div>
  );
}
