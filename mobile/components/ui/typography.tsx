import {
  Text as NativeText,
  StyleSheet,
  type StyleProp,
  type TextProps,
  type TextStyle
} from "react-native";

import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

type ThemeTone = keyof Pick<AppTheme["colors"], "foreground" | "muted" | "subtle" | "accentMuted" | "success" | "warning" | "danger">;

export type TextComponentProps = TextProps & {
  tone?: ThemeTone;
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
  fontFamily?: TextStyle["fontFamily"];
  style?: StyleProp<TextStyle>;
};

export function Text({
  children,
  tone = "foreground",
  weight,
  align = "auto",
  fontFamily,
  style,
  ...props
}: TextComponentProps) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style);
  const resolvedStyle = language === "en" && flattenedStyle?.textAlign === "right"
    ? { ...flattenedStyle, textAlign: "left" as const }
    : style;

  return (
    <NativeText
      {...props}
      style={[
        {
          color: theme.colors[tone],
          fontSize: theme.typography.body,
          fontWeight: weight ?? theme.fontWeights.regular,
          fontFamily: fontFamily ?? (language === "ar" ? theme.fontFamilies.arabic : theme.fontFamilies.latin),
          textAlign: align,
          includeFontPadding: false
        },
        resolvedStyle
      ]}
    >
      {children}
    </NativeText>
  );
}

export type HeadingProps = Omit<TextComponentProps, "weight"> & {
  level?: 1 | 2 | 3;
};

export function Heading({ level = 2, style, ...props }: HeadingProps) {
  const theme = useAppTheme();
  const sizes = {
    1: theme.typography.display,
    2: theme.typography.title,
    3: theme.typography.subtitle
  } satisfies Record<1 | 2 | 3, number>;

  return (
    <Text
      {...props}
      accessibilityRole="header"
      weight={theme.fontWeights.bold}
      style={[{ fontSize: sizes[level] }, style]}
    />
  );
}

export function Label(props: TextComponentProps) {
  const theme = useAppTheme();
  return (
    <Text
      {...props}
      weight={props.weight ?? theme.fontWeights.bold}
      style={[{ fontSize: theme.typography.caption + 2 }, props.style]}
    />
  );
}

export function Caption(props: TextComponentProps) {
  const theme = useAppTheme();
  return (
    <Text
      {...props}
      tone={props.tone ?? "muted"}
      style={[{ fontSize: theme.typography.caption }, props.style]}
    />
  );
}

export function PriceText({
  value,
  previousValue,
  tone = "foreground",
  weight,
  align = "auto",
  fontFamily,
  style,
  ...props
}: TextComponentProps & { value: string; previousValue?: string }) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style);
  const resolvedStyle = language === "en" && flattenedStyle?.textAlign === "right"
    ? { ...flattenedStyle, textAlign: "left" as const }
    : style;

  return (
    <NativeText
      {...props}
      style={[
        {
          color: theme.colors[tone],
          fontSize: theme.typography.title,
          fontWeight: weight ?? theme.fontWeights.extrabold,
          fontFamily: fontFamily ?? theme.fontFamilies.latin,
          fontVariant: ["tabular-nums"],
          textAlign: align,
          includeFontPadding: false
        },
        resolvedStyle
      ]}
    >
      {value}
      {previousValue ? (
        <NativeText
          style={{
            color: theme.colors.muted,
            fontSize: theme.typography.caption,
            fontWeight: theme.fontWeights.regular,
            textDecorationLine: "line-through"
          }}
        >
          {" "}{previousValue}
        </NativeText>
      ) : null}
    </NativeText>
  );
}

export function BadgeText({
  children,
  style,
  tone = "accent",
  weight,
  align = "right",
  fontFamily,
  ...props
}: Omit<TextComponentProps, "tone"> & { tone?: "accent" | "success" | "warning" | "danger" }) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style);
  const resolvedStyle = language === "en" && flattenedStyle?.textAlign === "right"
    ? { ...flattenedStyle, textAlign: "left" as const }
    : style;
  const colors = {
    accent: { backgroundColor: theme.colors.accent, color: theme.colors.accentForeground },
    success: { backgroundColor: theme.colors.successSurface, color: theme.colors.success },
    warning: { backgroundColor: theme.colors.warningSurface, color: theme.colors.warning },
    danger: { backgroundColor: theme.colors.dangerSurface, color: theme.colors.danger }
  } satisfies Record<typeof tone, { backgroundColor: string; color: string }>;
  const palette = colors[tone];

  return (
    <NativeText
      {...props}
      style={[
        {
          alignSelf: "flex-start",
          overflow: "hidden",
          paddingHorizontal: designTokens.spacing.sm,
          paddingVertical: designTokens.spacing.xs,
          borderRadius: theme.radius.pill,
          backgroundColor: palette.backgroundColor,
          color: palette.color,
          fontSize: theme.typography.caption,
          fontWeight: weight ?? theme.fontWeights.bold,
          fontFamily: fontFamily ?? (language === "ar" ? theme.fontFamilies.arabic : theme.fontFamilies.latin),
          textAlign: align,
          includeFontPadding: false
        },
        resolvedStyle
      ]}
    >
      {children}
    </NativeText>
  );
}
