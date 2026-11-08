import React, { createContext, useContext, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

/**
 * Arownd brand tokens.
 * Source: Arownd Brand Identity spec.
 */
export const brand = {
  primary: '#C6F135', // Lime Signal — accent only, never a large background fill
  dark: '#0A0A0A',
  light: '#F5F5F5',
  white: '#FFFFFF',
};

export const semantic = {
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
};

export type ThemeColors = {
  primary: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

export const lightColors: ThemeColors = {
  primary: brand.primary,
  onPrimary: brand.dark,
  background: brand.light,
  surface: brand.white,
  surfaceAlt: '#EFEFEF',
  text: brand.dark,
  textSecondary: '#737373',
  border: '#E5E5E5',
  ...semantic,
};

export const darkColors: ThemeColors = {
  primary: brand.primary,
  onPrimary: brand.dark,
  background: brand.dark,
  surface: '#171717',
  surfaceAlt: '#1F1F1F',
  text: brand.light,
  textSecondary: '#A3A3A3',
  border: '#262626',
  ...semantic,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const typography = {
  // Load both families at the app root (expo-font or react-native.config fonts).
  arabic: 'IBMPlexSansArabic',
  english: 'Inter',
  sizes: { xs: 12, sm: 13, base: 14, md: 16, lg: 19, xl: 24, xxl: 28 },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

/** Arownd is RTL-first. Call I18nManager.allowRTL(true) / forceRTL(true) once at app entry. */
export const isRTL = I18nManager.isRTL;

export type Theme = {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

function buildTheme(mode: 'light' | 'dark'): Theme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
  };
}

const ThemeContext = createContext<{
  theme: Theme;
  mode: 'light' | 'dark';
  setMode: (m: 'light' | 'dark') => void;
  toggleMode: () => void;
}>({
  theme: buildTheme('light'),
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
});

export function ThemeProvider({
  initialMode = 'light',
  children,
}: {
  initialMode?: 'light' | 'dark';
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<'light' | 'dark'>(initialMode);
  const value = useMemo(
    () => ({
      theme: buildTheme(mode),
      mode,
      setMode,
      toggleMode: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    }),
    [mode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
