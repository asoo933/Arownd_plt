import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

import { brandColors, extendedThemeColors, themeColors } from "./colors";
import { dimensions } from "./dimensions";
import { shadows } from "./shadows";
import { borderRadius, spacing } from "./spacing";
import { fontFamilies, fontWeights, typography } from "./typography";
import { isThemeMode, resolveThemeMode, type ThemeMode } from "./theme-state";

export type { ThemeMode } from "./theme-state";

const THEME_STORAGE_KEY = "arownd:theme-mode";

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
    inputBorder: string;
    focus: string;
    accent: string;
    accentForeground: string;
    accentMuted: string;
    danger: string;
    dangerText: string;
    dangerSurface: string;
    dangerBorder: string;
    success: string;
    successText: string;
    successSurface: string;
    successBorder: string;
    warning: string;
    warningText: string;
    warningSurface: string;
    warningBorder: string;
    info: string;
    infoText: string;
    infoSurface: string;
    infoBorder: string;
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

type ThemePreferenceContextValue = {
  mode: ThemeMode;
  isReady: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<AppTheme | null>(null);
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

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
      inputBorder: palette.inputBorder,
      focus: palette.focus,
      accent: brandColors.primary,
      accentForeground: brandColors.black,
      accentMuted: semanticPalette.accentMuted,
      danger: semanticPalette.danger,
      dangerText: semanticPalette.dangerText,
      dangerSurface: semanticPalette.dangerSurface,
      dangerBorder: semanticPalette.dangerBorder,
      success: semanticPalette.success,
      successText: semanticPalette.successText,
      successSurface: semanticPalette.successSurface,
      successBorder: semanticPalette.successBorder,
      warning: semanticPalette.warning,
      warningText: semanticPalette.warningText,
      warningSurface: semanticPalette.warningSurface,
      warningBorder: semanticPalette.warningBorder,
      info: semanticPalette.info,
      infoText: semanticPalette.infoText,
      infoSurface: semanticPalette.infoSurface,
      infoBorder: semanticPalette.infoBorder,
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

export function ThemeProvider({ children, mode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [storedMode, setStoredMode] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedValue) => {
        if (!active) return;
        if (isThemeMode(storedValue)) setStoredMode(storedValue);
      })
      .catch(() => {
        // Keep the system preference when local storage is unavailable.
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    setStoredMode(nextMode);
  }, []);

  const preference = mode ?? storedMode;
  const resolvedMode = resolveThemeMode(preference, systemScheme);
  const theme = useMemo(() => getAppTheme(resolvedMode), [resolvedMode]);
  const preferenceValue = useMemo(
    () => ({ mode: preference, isReady, setMode }),
    [preference, isReady, setMode]
  );

  return createElement(
    ThemePreferenceContext.Provider,
    { value: preferenceValue },
    createElement(ThemeContext.Provider, { value: theme }, children)
  );
}

export function useAppTheme(): AppTheme {
  const context = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  return context ?? getAppTheme(systemScheme === "dark" ? "dark" : "light");
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return context;
}
