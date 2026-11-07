export const Platform = {
  OS: "android",
  Version: 35
} as const;

export function useColorScheme(): "light" {
  return "light";
}
