import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

import { brandColors, extendedThemeColors, semanticColors, themeColors } from "./colors";
import { dimensions } from "./dimensions";
import { shadows } from "./shadows";
import { borderRadius, spacing } from "./spacing";
import { fontFamilies, fontWeights, typography } from "./typography";

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
  fontFamilies: typeof fontFamilies;
  fontWeights: typeof fontWeights;
  dimensions: typeof dimensions;
  shadows: typeof shadows;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function getAppTheme(mode: "light" | "dark"): AppTheme {
  const palette = themeColors[mode];
  const semanticPalette = extendedThemeColors[mode];
  return {
    mode,
    colors: {
      background: palette.background,
      surface: palette.surface,
      surfaceSecondary: palette.surfaceSecondary,
      surfaceTertiary: palette.surfaceTertiary,
      surfaceMuted: semanticPalette.surfaceMuted,
      foreground: palette.foreground,
      foregroundSecondary: palette.foregroundSecondary,
      foregroundMuted: palette.foregroundMuted,
      muted: palette.foregroundMuted,
      subtle: semanticPalette.subtle,
      border: palette.border,
      input: palette.input,
      accent: brandColors.lime,
      accentForeground: brandColors.black,
      accentMuted: semanticPalette.accentMuted,
      danger: semanticPalette.danger,
      dangerSurface: semanticPalette.dangerSurface,
      dangerBorder: semanticPalette.dangerBorder,
      success: semanticPalette.success,
      successSurface: semanticPalette.successSurface,
      successBorder: semanticPalette.successBorder,
      warning: semanticPalette.warning,
      warningSurface: semanticPalette.warningSurface,
      warningBorder: semanticPalette.warningBorder,
      info: semanticColors.info,
      placeholder: semanticPalette.placeholder,
      overlay: semanticPalette.overlay
    },
    spacing,
    radius: borderRadius,
    typography,
    fontFamilies,
    fontWeights,
    dimensions,
    shadows
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
