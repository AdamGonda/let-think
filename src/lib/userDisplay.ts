export function getUserInitials(name: string | undefined | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}
