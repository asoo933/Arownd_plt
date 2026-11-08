import { brandColors } from "@/lib/design-system";
import type { AppTheme } from "@/lib/theme";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

export type ButtonPalette = {
  backgroundColor: string;
  foregroundColor: string;
  borderColor?: string;
};

export function getButtonPalette(theme: AppTheme, variant: ButtonVariant): ButtonPalette {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: theme.colors.accent,
        foregroundColor: theme.colors.accentForeground
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        foregroundColor: theme.colors.foreground,
        borderColor: theme.colors.border
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        foregroundColor: theme.colors.foreground
      };
    case "danger":
      return {
        backgroundColor: theme.colors.danger,
        foregroundColor: brandColors.white
      };
  }
}
