import { UserAvatar } from "./UserAvatar";

type ProfileAvatarWithModeAccentProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  showAccentRing?: boolean;
};

/** Avatar with --session-accent ring (Rest / Focus); default size is slightly below `lg` so it fits the narrow sidebar. */
export function ProfileAvatarWithModeAccent({
  imageUrl,
  name,
  email,
  showAccentRing = true,
}: ProfileAvatarWithModeAccentProps) {
  return (
    <span
      className={`relative z-10 inline-flex shrink-0 rounded-full${
        showAccentRing ? " border-4 border-(--session-accent)" : ""
      }`}
    >
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
