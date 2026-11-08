import {
  Switch as NativeSwitch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/lib/theme";
import { clampProgress } from "./extended-state";

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

  return (
    <View
      style={[
        {
          minHeight: 48,
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
      <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: theme.colors.muted, fontSize: 20 }}>
        ⌕
      </Text>
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
          minHeight: 46,
          color: theme.colors.foreground,
          fontSize: theme.typography.body,
          textAlign: "right"
        }}
      />
    </View>
  );
}

export type SwitchControlProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function SwitchControl({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false
}: SwitchControlProps) {
  const theme = useAppTheme();

  return (
    <NativeSwitch
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
      thumbColor={theme.colors.surface}
      ios_backgroundColor={theme.colors.border}
    />
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
    neutral: { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.muted },
    success: { backgroundColor: theme.colors.successSurface, color: theme.colors.success },
    warning: { backgroundColor: theme.colors.warningSurface, color: theme.colors.warning },
    danger: { backgroundColor: theme.colors.dangerSurface, color: theme.colors.danger },
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
      <Text style={{ color: colors.color, fontSize: theme.typography.caption, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  progress,
  accessibilityLabel,
  color
}: {
  progress: number;
  accessibilityLabel: string;
  color?: string;
}) {
  const theme = useAppTheme();
  const normalizedProgress = clampProgress(progress);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}
      style={{
        height: 6,
        width: "100%",
        overflow: "hidden",
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.border
      }}
    >
      <View
        style={{
          width: `${normalizedProgress * 100}%`,
          height: "100%",
          borderRadius: theme.radius.pill,
          backgroundColor: color ?? theme.colors.accent
        }}
      />
    </View>
  );
}

export type TrackingStep = {
  id: string;
  label: string;
  detail?: string;
  completed: boolean;
  current?: boolean;
};

export function TrackingTimeline({ steps }: { steps: TrackingStep[] }) {
  const theme = useAppTheme();

  return (
    <View accessibilityRole="list" style={{ gap: theme.spacing.xs }}>
      {steps.map((step, index) => {
        const active = step.completed || step.current === true;
        return (
          <View key={step.id} accessibilityRole="listitem" style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <View style={{ width: 18, alignItems: "center" }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: theme.radius.pill,
                  borderWidth: 2,
                  borderColor: active ? theme.colors.accentMuted : theme.colors.border,
                  backgroundColor: step.completed ? theme.colors.accent : theme.colors.surface
                }}
              />
              {index < steps.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    minHeight: 28,
                    width: 2,
                    backgroundColor: step.completed ? theme.colors.accent : theme.colors.border
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: theme.spacing.md, gap: theme.spacing.xs }}>
              <Text style={{ color: active ? theme.colors.foreground : theme.colors.muted, fontSize: theme.typography.body, fontWeight: step.current ? "700" : "500" }}>
                {step.label}
              </Text>
              {step.detail ? (
                <Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption }}>
                  {step.detail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
