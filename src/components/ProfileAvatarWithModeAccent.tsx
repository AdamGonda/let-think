import { UserAvatar } from "./UserAvatar";

type ProfileAvatarWithModeAccentProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
};

/** Full-size avatar with --session-accent ring (Rest / Focus). */
export function ProfileAvatarWithModeAccent({
  imageUrl,
  name,
  email,
}: ProfileAvatarWithModeAccentProps) {
  return (
    <span className="relative z-10 inline-flex shrink-0 rounded-full border-4 border-(--session-accent)">
      <UserAvatar
        className="after:hidden"
        imageUrl={imageUrl}
        name={name}
        email={email}
      />
    </span>
  );
}
