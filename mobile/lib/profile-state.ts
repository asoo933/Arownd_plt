export function getProfileDisplayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = fullName?.trim();
  if (name) return name;
  const emailName = email?.trim();
  if (emailName) return emailName;
  return "Arownd";
}

export function getProfileInitial(displayName: string): string {
  return displayName.trim().charAt(0).toLocaleUpperCase("ar") || "A";
}
