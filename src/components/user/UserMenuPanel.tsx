import { HelpCircle, LogOut, X, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";

type UserMenuPanelProps = {
  onClose: () => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
};

export function UserMenuPanel({
  onClose,
  signOut,
  onRunTutorial,
}: UserMenuPanelProps) {
  const posthog = usePostHog();
  const navigate = useNavigate();
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

      <button
        type="button"
        role="menuitem"
        className={menuItemClass}
        onClick={() => {
          posthog.capture("square_opened_from_user_menu");
          void navigate({ to: "/square" });
          onClose();
        }}
      >
        <Users className="size-4" />
        Square
      </button>

      <div className="my-0.5 h-px bg-border/60" role="separator" />

      <button
        type="button"
        role="menuitem"
        className={menuItemClass}
        onClick={() => {
          posthog.capture("signed_out");
          posthog.reset();
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
