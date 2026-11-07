import { useColorScheme } from "react-native";

export type AppTheme = {
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    foreground: string;
    muted: string;
    subtle: string;
    border: string;
    accent: string;
    accentForeground: string;
    accentMuted: string;
    danger: string;
    dangerSurface: string;
    dangerBorder: string;
    success: string;
    successSurface: string;
    successBorder: string;
    warning: string;
    warningSurface: string;
    warningBorder: string;
    placeholder: string;
    overlay: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  typography: { caption: number; body: number; subtitle: number; title: number; display: number };
};

export const designTokens = {
  brand: { accent: "#C6F135", dark: "#0A0A0A", light: "#F5F5F5" },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 },
  radius: { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 },
  typography: { caption: 11, body: 14, subtitle: 16, title: 22, display: 29 }
} as const;

export function getAppTheme(mode: "light" | "dark"): AppTheme {
  const dark = mode === "dark";
  return {
    mode,
    colors: {
      background: dark ? "#0A0A0A" : "#F5F5F5",
      surface: dark ? "#171717" : "#FFFFFF",
      surfaceMuted: dark ? "#202020" : "#ECEFE4",
      foreground: dark ? "#F5F5F5" : "#0A0A0A",
      muted: dark ? "#A3A3A3" : "#737373",
      subtle: dark ? "#858585" : "#8A8A8A",
      border: dark ? "#333333" : "#E5E5E5",
      accent: "#C6F135",
      accentForeground: "#0A0A0A",
      accentMuted: dark ? "#C6F135" : "#647D13",
      danger: dark ? "#F97066" : "#B42318",
      dangerSurface: dark ? "#321A19" : "#FEECEB",
      dangerBorder: dark ? "#71312D" : "#F7C8C4",
      success: dark ? "#B9E65A" : "#3F6212",
      successSurface: dark ? "#1C2410" : "#F7FBEA",
      successBorder: dark ? "#4B5C20" : "#D7E9A1",
      warning: dark ? "#FBBF24" : "#9A6700",
      warningSurface: dark ? "#302510" : "#FFF7E0",
      warningBorder: dark ? "#70551D" : "#F0D99A",
      placeholder: dark ? "#737373" : "#A3A3A3",
      overlay: dark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.42)"
    },
    spacing: designTokens.spacing,
    radius: designTokens.radius,
    typography: designTokens.typography
  };
}

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return getAppTheme(scheme === "dark" ? "dark" : "light");
}
