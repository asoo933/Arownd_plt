export const brandColors = {
  lime: "#C6F135",
  limeDark: "#A8D522",
  limeLight: "#E5F8A8",
  black: "#0A0A0A",
  white: "#FFFFFF",
  light: "#F5F5F5"
} as const;

export const semanticColors = {
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB"
} as const;

export const commerceColors = {
  discount: "#DC2626",
  stockAvailable: "#16A34A",
  stockLow: "#D97706",
  stockOut: "#DC2626"
} as const;

export const deliveryColors = {
  pending: "#D97706",
  progress: "#2563EB",
  completed: "#16A34A",
  cancelled: "#DC2626"
} as const;

export const themeColors = {
  light: {
    background: "#F5F5F5",
    surface: "#FFFFFF",
    surfaceSecondary: "#EEEEEE",
    surfaceTertiary: "#E5E5E5",
    foreground: "#0A0A0A",
    foregroundSecondary: "#525252",
    foregroundMuted: "#737373",
    border: "#E5E5E5",
    input: "#F5F5F5"
  },
  dark: {
    background: "#0A0A0A",
    surface: "#171717",
    surfaceSecondary: "#262626",
    surfaceTertiary: "#333333",
    foreground: "#F5F5F5",
    foregroundSecondary: "#D4D4D4",
    foregroundMuted: "#A3A3A3",
    border: "#333333",
    input: "#171717"
  }
} as const;
