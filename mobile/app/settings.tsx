import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { isThemeMode, useThemePreference } from "@/lib/design-system";
import { CustomerScreen } from "@/components/customer-ui";
import {
  BottomSheet,
  Button,
  Caption,
  Card,
  ConfirmDialog,
  Heading,
  Icon,
  PressableSurface,
  SegmentedControl,
  Text as UiText,
  TextField,
  type IconName
} from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";
import { resetPasswordSchema } from "@/lib/auth-validation";
import { getSupabaseClient } from "@/lib/supabase";
import { unregisterCurrentPushDevice } from "@/lib/push-notifications";
import { fetchCountries, fetchMyBrowsingCountryCode, updateBrowsingCountryCode, type Country } from "@/lib/country-service";

type SettingsSheet = "password" | "appearance" | "language" | "country" | null;

export default function SettingsScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useThemePreference();
  const { language, setLanguage } = useLanguage();
  const [activeSheet, setActiveSheet] = useState<SettingsSheet>(null);
  const [appearanceError, setAppearanceError] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordStrength = getPasswordStrength(password);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const countries = useQuery({ queryKey: ["available-countries"], queryFn: fetchCountries, enabled: activeSheet === "country" });
  const browsingCountry = useQuery({ queryKey: ["browsing-country"], queryFn: fetchMyBrowsingCountryCode });
  const browsingCountryMutation = useMutation({
    mutationFn: updateBrowsingCountryCode,
    onSuccess: async () => { setFormError(null); await queryClient.invalidateQueries(); await browsingCountry.refetch(); closeSheet(); },
    onError: () => setFormError(translate("settingsCountrySaveError"))
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword) throw new Error("passwordCurrentRequired");
      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "passwordInvalid");
      const client = getSupabaseClient();
      const { data: currentUserData, error: currentUserError } = await client.auth.getUser();
      const currentUser = currentUserData.user;
      if (currentUserError || !currentUser?.email) throw new Error("passwordCurrentInvalid");

      const { data: reauthenticated, error: reauthenticationError } = await client.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });
      if (reauthenticationError || reauthenticated.user?.id !== currentUser.id) {
        throw new Error("passwordCurrentInvalid");
      }

      const { error } = await client.auth.updateUser({
        password: parsed.data.password,
        current_password: currentPassword
      });
      if (error) {
        if (error.code === "current_password_mismatch" || error.code === "current_password_required") {
          throw new Error("passwordCurrentInvalid");
        }
        throw error;
      }
    },
    onSuccess: () => {
      setFormError(null);
      setMessage(translate("settingsPasswordSaved"));
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      setMessage(null);
      setFormError(error.message === "passwordCurrentRequired" || error.message === "passwordCurrentInvalid"
        ? translate("passwordCurrentInvalid")
        : error.message === "passwordMin"
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
      await unregisterCurrentPushDevice();
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.clear();
      router.replace("/login");
    },
    onError: () => setSignOutError(true)
  });

  const openSheet = (sheet: Exclude<SettingsSheet, null>) => {
    setActiveSheet(sheet);
    setFormError(null);
    setMessage(null);
  };
  const closeSheet = () => setActiveSheet(null);

  return (
    <CustomerScreen showNavigation={false} contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Heading level={2} style={styles.headerTitle}>{translate("settingsTitle")}</Heading>
        <PressableSurface
          accessibilityRole="button"
          accessibilityLabel={translate("back")}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
        </PressableSurface>
      </View>
      <Caption>{translate("settingsSubtitle")}</Caption>

      <View style={styles.section}>
        <Heading level={3}>{translate("settingsPreferencesTitle")}</Heading>
        <Card contentStyle={styles.sectionContent}>
          <SettingsRow
            icon="map-pin"
            label={translate("settingsBrowsingCountry")}
            onPress={() => openSheet("country")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="palette"
            label={translate("settingsAppearanceHint")}
            onPress={() => openSheet("appearance")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="globe"
            label={translate("settingsLanguageTitle")}
            onPress={() => openSheet("language")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="bell"
            label={translate("notificationsTitle")}
            onPress={() => router.push("/notifications")}
            theme={theme}
            styles={styles}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Heading level={3}>{translate("settingsPrivacyTitle")}</Heading>
        <Card contentStyle={styles.sectionContent}>
          <SettingsRow
            icon="lock"
            label={translate("settingsPasswordChangeTitle")}
            onPress={() => openSheet("password")}
            theme={theme}
            styles={styles}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Heading level={3}>{translate("settingsSupportSection")}</Heading>
        <Card contentStyle={styles.sectionContent}>
          <SettingsRow
            icon="info"
            label={translate("settingsSupportTitle")}
            onPress={() => router.push("/support")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="info"
            label={translate("settingsAboutTitle")}
            onPress={() => router.push("/about")}
            theme={theme}
            styles={styles}
            last
          />
        </Card>
      </View>

      <Button
        label={translate("settingsSignOut")}
        onPress={() => {
          setSignOutError(false);
          setSignOutConfirmOpen(true);
        }}
        disabled={signOutMutation.isPending}
        variant="danger"
        fullWidth
        style={styles.signOutButton}
      />
      {signOutError ? <UiText tone="danger">{translate("settingsSignOutError")}</UiText> : null}

      <BottomSheet visible={activeSheet === "password"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("settingsPasswordChangeTitle")}</Heading>
        <Caption>{translate("settingsPasswordHint")}</Caption>
        <TextField
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            setFormError(null);
            setMessage(null);
          }}
          placeholder={translate("currentPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          style={styles.input}
        />
        <TextField
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFormError(null);
            setMessage(null);
          }}
          placeholder={translate("newPassword")}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          style={styles.input}
        />
        <View style={styles.passwordStrength}>
          <Caption>{translate("passwordMin")}</Caption>
          <View style={styles.strengthHeader}>
            <Caption>{translate("passwordStrength")}: {translate(passwordStrengthLabel(passwordStrength))}</Caption>
            <View style={styles.strengthBars}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.strengthBar,
                    index < passwordStrength && {
                      backgroundColor: passwordStrength >= 3 ? theme.colors.success : theme.colors.accent
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
        <TextField
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setFormError(null);
            setMessage(null);
          }}
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
          disabled={passwordMutation.isPending || !currentPassword || !password || !confirmPassword}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet visible={activeSheet === "country"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("settingsBrowsingCountry")}</Heading>
        <Caption>{translate("settingsBrowsingCountryHint")}</Caption>
        {countries.isPending || browsingCountry.isPending ? <Caption>{translate("stateLoading")}</Caption> : countries.isError || browsingCountry.isError ? <UiText tone="danger">{translate("settingsCountryLoadError")}</UiText> : (
          <View style={styles.sheetContent}>
            {(countries.data ?? []).filter((country: Country) => country.is_enabled).map((country) => {
              const selected = browsingCountry.data === country.code;
              const countryName = language === "ar" ? country.name_ar : country.name_en ?? country.name_ar;
              return <PressableSurface key={country.code} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { setFormError(null); if (!selected) browsingCountryMutation.mutate(country.code); }} style={[styles.languageOption, selected && { borderWidth: 1, borderColor: theme.colors.accent }]}>
                <UiText weight="700">{country.flag_emoji ?? "🌐"}  {countryName} · {country.currency_code}</UiText>
                {selected ? <Icon name="circle-check" size={19} color={theme.colors.success} /> : null}
              </PressableSurface>;
            })}
          </View>
        )}
        {formError ? <UiText tone="danger">{formError}</UiText> : null}
        {browsingCountryMutation.isPending ? <Caption>{translate("stateLoading")}</Caption> : null}
      </BottomSheet>

      <BottomSheet visible={activeSheet === "appearance"} onRequestClose={closeSheet}>
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
      </BottomSheet>

      <BottomSheet visible={activeSheet === "language"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("settingsLanguageTitle")}</Heading>
        <PressableSurface
          accessibilityRole="button"
          accessibilityState={{ selected: language === "ar" }}
          onPress={() => {
            setLanguageError(false);
            void setLanguage("ar").catch(() => setLanguageError(true));
          }}
          style={[styles.languageOption, language === "ar" && { backgroundColor: theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceSecondary }]}
        >
          <UiText weight={language === "ar" ? "700" : "500"}>{translate("settingsLanguageArabic")}</UiText>
          {language === "ar" ? <Icon name="circle-check" size={19} color={theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted} /> : null}
        </PressableSurface>
        <PressableSurface
          accessibilityRole="button"
          accessibilityState={{ selected: language === "en" }}
          onPress={() => {
            setLanguageError(false);
            void setLanguage("en").catch(() => setLanguageError(true));
          }}
          style={[styles.languageOption, language === "en" && { backgroundColor: theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceSecondary }]}
        >
          <UiText weight={language === "en" ? "700" : "500"}>{translate("settingsLanguageEnglish")}</UiText>
          {language === "en" ? <Icon name="circle-check" size={19} color={theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted} /> : null}
        </PressableSurface>
        <Caption>{translate("settingsLanguageComingSoon")}</Caption>
        {languageError ? <UiText tone="danger">{translate("settingsLanguageSaveError")}</UiText> : null}
      </BottomSheet>

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

function SettingsRow({
  icon,
  label,
  onPress,
  theme,
  styles,
  last = false
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.linkRow, last ? undefined : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}
    >
      <View style={styles.linkLabel}>
        <View style={styles.iconBadge}>
          <Icon name={icon} size={19} color={theme.colors.accent} />
        </View>
        <UiText weight="700">{label}</UiText>
      </View>
      <View style={styles.rowTrailing}>
        <Icon name="chevron-left" size={18} color={theme.colors.subtle} />
      </View>
    </PressableSurface>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenContent: { gap: designTokens.spacing.md },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.md
    },
    headerTitle: {
      flex: 1,
      textAlign: "auto"
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: designTokens.radius.lg,
      backgroundColor: theme.colors.surfaceSecondary
    },
    section: {
      gap: designTokens.spacing.sm,
      marginTop: 0
    },
    sectionContent: {
      gap: 0,
      paddingHorizontal: designTokens.spacing.md,
      paddingVertical: designTokens.spacing.xs,
      borderRadius: designTokens.radius.xl
    },
    input: {
      height: designTokens.dimensions.controlHeight.lg,
      minHeight: designTokens.dimensions.controlHeight.lg,
      paddingVertical: 0,
      textAlign: "auto"
    },
    passwordStrength: {
      gap: designTokens.spacing.xs
    },
    strengthHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: designTokens.spacing.md
    },
    strengthBars: {
      flex: 1,
      flexDirection: "row",
      gap: designTokens.spacing.xs
    },
    strengthBar: {
      flex: 1,
      height: 5,
      borderRadius: designTokens.radius.pill,
      backgroundColor: theme.colors.surfaceMuted
    },
    linkRow: {
      minHeight: 68,
      paddingVertical: designTokens.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: designTokens.spacing.md
    },
    linkLabel: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.md
    },
    iconBadge: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: designTokens.radius.md,
      backgroundColor: theme.colors.surfaceSecondary
    },
    rowTrailing: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: designTokens.radius.pill,
      backgroundColor: theme.colors.surfaceMuted
    },
    sheetContent: {
      gap: designTokens.spacing.md
    },
    languageOption: {
      minHeight: designTokens.dimensions.controlHeight.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: designTokens.spacing.md,
      borderRadius: designTokens.radius.md,
      backgroundColor: theme.mode === "dark" ? theme.colors.surfaceSecondary : theme.colors.surfaceMuted
    },
    signOutButton: {
      marginTop: designTokens.spacing.md,
      marginBottom: designTokens.spacing.sm
    }
  });
}

function getPasswordStrength(value: string): number {
  if (!value) return 0;
  return [
    value.length >= 8,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value)
  ].filter(Boolean).length;
}

function passwordStrengthLabel(score: number): "passwordStrengthWeak" | "passwordStrengthFair" | "passwordStrengthGood" | "passwordStrengthStrong" {
  if (score <= 1) return "passwordStrengthWeak";
  if (score === 2) return "passwordStrengthFair";
  if (score === 3) return "passwordStrengthGood";
  return "passwordStrengthStrong";
}
