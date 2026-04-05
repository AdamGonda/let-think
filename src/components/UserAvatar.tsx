import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/userDisplay";

type UserAvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
};

export function UserAvatar({
  imageUrl,
  name,
  email,
  className,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when avatar URL changes
    setImageError(false);
  }, [imageUrl]);

  const initials = getUserInitials(name ?? email ?? undefined);

  return (
    <Avatar size="lg" className={className}>
      {imageUrl && !imageError ? (
        <AvatarImage
          src={imageUrl}
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
}
