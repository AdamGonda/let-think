import { UserAvatar } from "./UserAvatar";

type ProfileAvatarWithModeAccentProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
};

/** Avatar with --session-accent ring (Rest / Focus); default size is slightly below `lg` so it fits the narrow sidebar. */
export function ProfileAvatarWithModeAccent({
  imageUrl,
  name,
  email,
}: ProfileAvatarWithModeAccentProps) {
  return (
    <span className="relative z-10 inline-flex shrink-0 rounded-full border-4 border-(--session-accent)">
      <UserAvatar
        size="default"
        className="after:hidden"
        imageUrl={imageUrl}
        name={name}
        email={email}
      />
    </span>
  );
}
