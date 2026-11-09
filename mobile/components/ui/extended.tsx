import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { Text as UiText } from "./typography";
import { Icon } from "./icon";

export type SearchFieldProps = Pick<TextInputProps, "autoCapitalize" | "autoCorrect" | "onSubmitEditing" | "returnKeyType"> & {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  autoCapitalize = "none",
  autoCorrect = false,
  onSubmitEditing,
  returnKeyType = "search",
  style
}: SearchFieldProps) {
  const theme = useAppTheme();
  const { language } = useLanguage();

  return (
    <View
      style={[
        {
          minHeight: theme.dimensions.controlHeight.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface
        },
        style
      ]}
    >
      <Icon name="search" size={theme.dimensions.iconSize.md} color={theme.colors.muted} accessibilityHidden />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={{
          flex: 1,
          minHeight: theme.dimensions.controlHeight.lg,
          color: theme.colors.foreground,
          fontSize: theme.typography.body,
          fontWeight: theme.fontWeights.regular,
          fontFamily: language === "ar" ? theme.fontFamilies.arabic : theme.fontFamilies.latin,
          textAlign: "auto",
          includeFontPadding: false
        }}
      />
    </View>
  );
}

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

export function StatusBadge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: StatusBadgeTone;
}) {
  const theme = useAppTheme();
  const palette = {
    neutral: { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.subtle },
    success: { backgroundColor: theme.colors.successSurface, color: theme.colors.successText },
    warning: { backgroundColor: theme.colors.warningSurface, color: theme.colors.warningText },
    danger: { backgroundColor: theme.colors.dangerSurface, color: theme.colors.dangerText },
    accent: { backgroundColor: theme.colors.accent, color: theme.colors.accentForeground }
  } satisfies Record<StatusBadgeTone, { backgroundColor: string; color: string }>;
  const colors = palette[tone];

  return (
    <View
      accessibilityRole="text"
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: colors.backgroundColor
      }}
    >
      <UiText style={{ color: colors.color, fontSize: theme.typography.caption, fontWeight: theme.fontWeights.bold }}>
        {label}
      </UiText>
    </View>
  );
}
