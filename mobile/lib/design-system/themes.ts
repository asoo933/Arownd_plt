import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

import { brandColors, semanticColors, themeColors } from "./colors";
import { borderRadius, spacing } from "./spacing";
import { typography } from "./typography";

export type ThemeMode = "system" | "light" | "dark";

export type AppTheme = {
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    surfaceTertiary: string;
    surfaceMuted: string;
    foreground: string;
    foregroundSecondary: string;
    foregroundMuted: string;
    muted: string;
    subtle: string;
    border: string;
    input: string;
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
    info: string;
    placeholder: string;
    overlay: string;
  };
  spacing: typeof spacing;
  radius: typeof borderRadius;
  typography: typeof typography;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function getAppTheme(mode: "light" | "dark"): AppTheme {
  const dark = mode === "dark";
  const palette = themeColors[mode];
  return {
    mode,
    colors: {
      background: palette.background,
      surface: palette.surface,
      surfaceSecondary: palette.surfaceSecondary,
      surfaceTertiary: palette.surfaceTertiary,
      surfaceMuted: dark ? "#202020" : "#ECEFE4",
      foreground: palette.foreground,
      foregroundSecondary: palette.foregroundSecondary,
      foregroundMuted: palette.foregroundMuted,
      muted: palette.foregroundMuted,
      subtle: dark ? "#858585" : "#8A8A8A",
      border: palette.border,
      input: palette.input,
      accent: brandColors.lime,
      accentForeground: brandColors.black,
      accentMuted: dark ? brandColors.lime : "#647D13",
      danger: dark ? "#F97066" : "#B42318",
      dangerSurface: dark ? "#321A19" : "#FEECEB",
      dangerBorder: dark ? "#71312D" : "#F7C8C4",
      success: dark ? "#B9E65A" : "#3F6212",
      successSurface: dark ? "#1C2410" : "#F7FBEA",
      successBorder: dark ? "#4B5C20" : "#D7E9A1",
      warning: dark ? "#FBBF24" : "#9A6700",
      warningSurface: dark ? "#302510" : "#FFF7E0",
      warningBorder: dark ? "#70551D" : "#F0D99A",
      info: semanticColors.info,
      placeholder: dark ? "#737373" : "#A3A3A3",
      overlay: dark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.42)"
    },
    spacing,
    radius: borderRadius,
    typography
  };
}

type ThemeProviderProps = PropsWithChildren<{ mode?: ThemeMode }>;

export function ThemeProvider({ children, mode = "system" }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolvedMode = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const theme = useMemo(() => getAppTheme(resolvedMode), [resolvedMode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const context = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  return context ?? getAppTheme(systemScheme === "dark" ? "dark" : "light");
}
