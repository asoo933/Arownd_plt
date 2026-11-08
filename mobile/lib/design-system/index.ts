export { brandColors, commerceColors, deliveryColors, extendedThemeColors, semanticColors, themeColors } from "./colors";
export { dimensions } from "./dimensions";
export { shadows } from "./shadows";
export { borderRadius, spacing } from "./spacing";
export { fontFamilies, fontWeights, typography } from "./typography";
export { getAppTheme, ThemeProvider, useAppTheme } from "./themes";
export type { AppTheme, ThemeMode } from "./themes";

import { brandColors, commerceColors, deliveryColors, semanticColors, themeColors } from "./colors";
import { dimensions } from "./dimensions";
import { shadows } from "./shadows";
import { borderRadius, spacing } from "./spacing";
import { fontFamilies, fontWeights, typography } from "./typography";

export const designTokens = {
  brand: { ...brandColors, accent: brandColors.lime, dark: brandColors.black, light: brandColors.light },
  semantic: semanticColors,
  commerce: commerceColors,
  delivery: deliveryColors,
  colors: themeColors,
  spacing,
  radius: borderRadius,
  dimensions,
  shadows,
  typography,
  fontFamilies,
  fontWeights
} as const;
