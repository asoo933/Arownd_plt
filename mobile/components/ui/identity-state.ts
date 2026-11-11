export function getIdentityInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => Array.from(part)[0] ?? "").join("").toLocaleUpperCase();
}
