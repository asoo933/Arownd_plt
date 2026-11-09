export { brandColors, commerceColors, deliveryColors, extendedThemeColors, semanticColors, themeColors } from "./colors";
export { dimensions } from "./dimensions";
export { shadows } from "./shadows";
export { borderRadius, spacing } from "./spacing";
export { fontFamilies, fontWeights, typography } from "./typography";
export { getAppTheme, ThemeProvider, useAppTheme, useThemePreference } from "./themes";
export { isThemeMode, resolveThemeMode } from "./theme-state";
export type { AppTheme, ThemeMode } from "./themes";

import { brandColors, commerceColors, deliveryColors, extendedThemeColors, semanticColors, themeColors } from "./colors";
import { dimensions } from "./dimensions";
import { shadows } from "./shadows";
import { borderRadius, spacing } from "./spacing";
import { fontFamilies, fontWeights, typography } from "./typography";

export const designTokens = {
  brand: { ...brandColors, accent: brandColors.primary, dark: brandColors.black, light: brandColors.light },
  semantic: semanticColors,
  commerce: commerceColors,
  delivery: deliveryColors,
  colors: themeColors,
  semanticTheme: extendedThemeColors,
  spacing,
  radius: borderRadius,
  dimensions,
  shadows,
  typography,
  fontFamilies,
  fontWeights
} as const;
