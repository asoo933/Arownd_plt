export type ThemeMode = "system" | "light" | "dark";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveThemeMode(
  preference: ThemeMode,
  systemScheme: "light" | "dark" | null | undefined
): "light" | "dark" {
  if (preference !== "system") return preference;
  return systemScheme === "dark" ? "dark" : "light";
}
