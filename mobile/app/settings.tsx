import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { isThemeMode, useThemePreference } from "@/lib/design-system";
import { CustomerScreen } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  ConfirmDialog,
  Heading,
  Icon,
  PressableSurface,
  SegmentedControl,
  Text as UiText,
  TextField
} from "@/components/ui";
import { translate } from "@/lib/i18n";
import { resetPasswordSchema } from "@/lib/auth-validation";
import { getSupabaseClient } from "@/lib/supabase";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useThemePreference();
  const [appearanceError, setAppearanceError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "passwordInvalid");
      const { error } = await getSupabaseClient().auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
    },
    onSuccess: () => {
      setFormError(null);
      setMessage(translate("settingsPasswordSaved"));
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      setMessage(null);
      setFormError(error.message === "passwordMin"
        ? translate("passwordMin")
        : error.message === "passwordMismatch"
          ? translate("passwordMismatch")
          : error.message === "required"
            ? translate("required")
            : translate("settingsPasswordError"));
    }
  });
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.clear();
      router.replace("/login");
    },
    onError: () => setSignOutError(true)
  });

  return (
    <CustomerScreen showNavigation={false}>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={translate("back")}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>
      <AppHeader title={translate("settingsTitle")} />
      <Caption>{translate("settingsSubtitle")}</Caption>

      <Card contentStyle={styles.sectionContent}>
        <Heading level={3}>{translate("settingsSecurityTitle")}</Heading>
        <Caption>{translate("settingsPasswordHint")}</Caption>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder={translate("newPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={styles.input}
        />
        <TextField
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={translate("confirmPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={styles.input}
        />
        {formError ? <UiText tone="danger">{formError}</UiText> : null}
        {message ? <UiText tone="success" weight="700">{message}</UiText> : null}
        <Button
          label={translate("settingsPasswordSave")}
          onPress={() => passwordMutation.mutate()}
          loading={passwordMutation.isPending}
          fullWidth
        />
      </Card>

      <Card contentStyle={styles.sectionContent}>
        <Heading level={3}>{translate("settingsSecurityTitle")}</Heading>
        <PressableSurface
          accessibilityRole="button"
          accessibilityLabel={translate("profileEditDetails")}
          onPress={() => router.push("/delivery-profile")}
          style={styles.linkRow}
        >
          <View style={styles.linkLabel}>
            <Icon name="user" size={19} color={theme.colors.foregroundSecondary} />
            <UiText weight="700">{translate("profileEditDetails")}</UiText>
          </View>
          <Icon name="chevron-left" size={19} color={theme.colors.subtle} />
        </PressableSurface>
        <PressableSurface
          accessibilityRole="button"
          accessibilityLabel={translate("profileAddresses")}
          onPress={() => router.push("/addresses")}
          style={styles.linkRow}
        >
          <View style={styles.linkLabel}>
            <Icon name="map-pin" size={19} color={theme.colors.foregroundSecondary} />
            <UiText weight="700">{translate("profileAddresses")}</UiText>
          </View>
          <Icon name="chevron-left" size={19} color={theme.colors.subtle} />
        </PressableSurface>
        <Heading level={4}>{translate("settingsPasswordChangeTitle")}</Heading>
        <Caption>{translate("settingsPasswordHint")}</Caption>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder={translate("newPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={styles.input}
        />
        <TextField
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={translate("confirmPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={styles.input}
        />
        {formError ? <UiText tone="danger">{formError}</UiText> : null}
        {message ? <UiText tone="success" weight="700">{message}</UiText> : null}
        <Button
          label={translate("settingsPasswordSave")}
          onPress={() => passwordMutation.mutate()}
          loading={passwordMutation.isPending}
          fullWidth
        />
      </Card>

      <Card style={styles.sectionCard} contentStyle={styles.sectionContent}>
        <Heading level={3}>{translate("settingsAppearanceTitle")}</Heading>
        <Caption>{translate("settingsAppearanceHint")}</Caption>
        <SegmentedControl
          accessibilityLabel={translate("settingsAppearanceTitle")}
          value={themeMode}
          onChange={(value) => {
            if (!isThemeMode(value)) return;
            setAppearanceError(false);
            void setThemeMode(value).catch(() => setAppearanceError(true));
          }}
          options={[
            { key: "system", label: translate("settingsThemeSystem") },
            { key: "light", label: translate("settingsThemeLight") },
            { key: "dark", label: translate("settingsThemeDark") }
          ]}
        />
        {appearanceError ? <UiText tone="danger">{translate("settingsAppearanceError")}</UiText> : null}
      </Card>

      <Card contentStyle={styles.sectionContent}>
        <Button
          label={translate("settingsSignOut")}
          onPress={() => {
            setSignOutError(false);
            setSignOutConfirmOpen(true);
          }}
          disabled={signOutMutation.isPending}
          variant="danger"
          fullWidth
        />
        {signOutError ? <UiText tone="danger">{translate("settingsSignOutError")}</UiText> : null}
      </Card>

      <ConfirmDialog
        visible={signOutConfirmOpen}
        onRequestClose={() => {
          if (!signOutMutation.isPending) setSignOutConfirmOpen(false);
        }}
        onConfirm={() => {
          setSignOutError(false);
          signOutMutation.mutate();
        }}
        title={translate("settingsSignOutConfirmTitle")}
        description={translate("settingsSignOutConfirmHint")}
        cancelLabel={translate("back")}
        confirmLabel={translate("settingsSignOutConfirmAction")}
        busy={signOutMutation.isPending}
        destructive
      />
    </CustomerScreen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      borderRadius: designTokens.radius.md
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: designTokens.radius.lg
    },
    sectionContent: {
      gap: designTokens.spacing.md,
      padding: designTokens.spacing.lg
    },
    input: {
      minHeight: 48,
      textAlign: "right"
    },
    linkRow: {
      minHeight: 54,
      paddingVertical: designTokens.spacing.xs,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: designTokens.spacing.md
    },
    linkLabel: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: designTokens.spacing.md
    }
  });
}
