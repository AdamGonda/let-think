import { useCallback } from "react";
import { toast } from "sonner";
import { LogOut, HelpCircle, Unplug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";

export type UserMenuPanelProps = {
  onClose: () => void;
  signOut: () => void | Promise<void>;
  onRunTutorial?: () => void;
};

export function UserMenuPanel({
  onClose,
  signOut,
  onRunTutorial,
}: UserMenuPanelProps) {
  const { connected, disconnect } = useSpotifyPlayer();

  const onDisconnectSpotify = useCallback(async () => {
    try {
      const result = await disconnect();
      if (!result.removedConnection && result.removedOauthStates === 0) {
        toast.message("Spotify already disconnected.");
        return;
      }
      toast.success("Spotify disconnected.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect Spotify");
    }
  }, [disconnect, onClose]);

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

      <div className="my-0.5 h-px bg-border/60" role="separator" />

      {connected ? (
        <button
          type="button"
          role="menuitem"
          className={menuItemClass}
          onClick={() => void onDisconnectSpotify()}
        >
          <Unplug className="size-4" />
          Disconnect Spotify
        </button>
      ) : null}

      {connected ? (
        <div className="my-0.5 h-px bg-border/60" role="separator" />
      ) : null}

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
