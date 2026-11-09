import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthLayout, ActionButton } from "@/components/auth-ui";
import { Button, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

type AccountType = "personal" | "business";

type AccountTypeOptionProps = {
  title: string;
  description: string;
  icon: "user" | "store";
  selected: boolean;
  onPress: () => void;
};

function AccountTypeOption({
  title,
  description,
  icon,
  selected,
  onPress
}: AccountTypeOptionProps) {
  const theme = useAppTheme();

  return (
    <PressableSurface
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: selected ? (theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceMuted) : (theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface),
          borderColor: selected ? (theme.mode === "light" ? theme.colors.accent : theme.colors.accentMuted) : (theme.mode === "light" ? "transparent" : theme.colors.border),
          borderWidth: selected ? 2 : theme.mode === "light" ? 0 : 1
        }
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceMuted }
        ]}
      >
        <Icon
          name={icon}
          color={selected ? theme.colors.accentForeground : theme.colors.foreground}
          size={designTokens.dimensions.iconSize.md}
        />
      </View>

      <View style={styles.copy}>
        <UiText weight={designTokens.fontWeights.extrabold} style={styles.optionTitle}>
          {title}
        </UiText>
        <UiText tone="muted" style={styles.optionDescription}>
          {description}
        </UiText>
      </View>

      <Icon
        name={selected ? "circle-check" : "chevron-left"}
        color={selected ? (theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted) : theme.colors.muted}
        size={designTokens.dimensions.iconSize.md}
      />
    </PressableSurface>
  );
}

export default function AccountTypeScreen() {
  useLanguage();
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>("personal");

  return (
    <AuthLayout
      title={translate("chooseAccountTitle")}
      subtitle={translate("chooseAccountSubtitle")}
      showBack
    >
      <View style={styles.content}>
        <View style={styles.options}>
          <AccountTypeOption
            title={translate("personalTitle")}
            description={translate("personalDescription")}
            icon="user"
            selected={selectedAccountType === "personal"}
            onPress={() => setSelectedAccountType("personal")}
          />
          <AccountTypeOption
            title={translate("businessTitle")}
            description={translate("businessDescription")}
            icon="store"
            selected={selectedAccountType === "business"}
            onPress={() => setSelectedAccountType("business")}
          />
        </View>

        <View style={styles.actions}>
          <ActionButton
            label={translate("continue")}
            onPress={() => router.push(
              selectedAccountType === "personal" ? "/signup-personal" : "/signup-business"
            )}
          />
          <Button
            label={translate("backToLogin")}
            onPress={() => router.replace("/login")}
            variant="outline"
            size="lg"
            fullWidth
          />
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: designTokens.spacing.lg
  },
  options: {
    gap: designTokens.spacing.md
  },
  option: {
    minHeight: designTokens.dimensions.controlHeight.lg * 2 + designTokens.spacing.xs,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md
  },
  iconCircle: {
    width: designTokens.dimensions.controlHeight.lg,
    height: designTokens.dimensions.controlHeight.lg,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: designTokens.spacing.xs
  },
  optionTitle: {
    fontSize: designTokens.typography.subtitle - 1,
    textAlign: "auto"
  },
  optionDescription: {
    fontSize: designTokens.typography.caption + 1,
    lineHeight: designTokens.typography.body + designTokens.spacing.xs,
    textAlign: "auto"
  },
  actions: {
    gap: designTokens.spacing.md
  }
});
