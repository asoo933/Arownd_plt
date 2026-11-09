import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { isThemeMode, useThemePreference } from "@/lib/design-system";
import { CustomerScreen } from "@/components/customer-ui";
import {
  AppHeader,
  BottomSheet,
  Button,
  Caption,
  Card,
  ConfirmDialog,
  Heading,
  Icon,
  PressableSurface,
  SegmentedControl,
  Surface,
  Text as UiText,
  TextField,
  type IconName
} from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";
import { resetPasswordSchema } from "@/lib/auth-validation";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { fetchMyAddresses } from "@/lib/user-address";

type SettingsSheet = "delivery" | "addresses" | "password" | "appearance" | "language" | null;

export default function SettingsScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useThemePreference();
  const { language, setLanguage } = useLanguage();
  const [activeSheet, setActiveSheet] = useState<SettingsSheet>(null);
  const [appearanceError, setAppearanceError] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const deliveryProfile = useQuery({
    queryKey: ["my-delivery-profile"],
    queryFn: fetchMyDeliveryProfile,
    enabled: activeSheet === "delivery"
  });
  const addresses = useQuery({
    queryKey: ["my-addresses"],
    queryFn: fetchMyAddresses,
    enabled: activeSheet === "addresses"
  });

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

  const openSheet = (sheet: Exclude<SettingsSheet, null>) => {
    setActiveSheet(sheet);
    setFormError(null);
    setMessage(null);
  };
  const closeSheet = () => setActiveSheet(null);

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

      <View style={styles.section}>
        <Heading level={3}>{translate("settingsSecurityTitle")}</Heading>
        <Card contentStyle={styles.sectionContent}>
          <SettingsRow
            icon="user"
            label={translate("profileEditDetails")}
            onPress={() => openSheet("delivery")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="map-pin"
            label={translate("profileAddresses")}
            onPress={() => openSheet("addresses")}
            theme={theme}
            styles={styles}
          />
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
        <Heading level={3}>{translate("settingsPreferencesTitle")}</Heading>
        <Card contentStyle={styles.sectionContent}>
          <SettingsRow
            icon="settings"
            label={translate("settingsAppearanceHint")}
            onPress={() => openSheet("appearance")}
            theme={theme}
            styles={styles}
          />
          <SettingsRow
            icon="list"
            label={translate("settingsLanguageTitle")}
            onPress={() => openSheet("language")}
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

      <BottomSheet visible={activeSheet === "delivery"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("profileEditDetails")}</Heading>
        {deliveryProfile.isPending ? (
          <Caption>{translate("stateLoading")}</Caption>
        ) : deliveryProfile.isError ? (
          <UiText tone="danger">{translate("deliveryProfileLoadError")}</UiText>
        ) : deliveryProfile.data ? (
          <View style={styles.sheetContent}>
            <Surface elevated={false} padding={designTokens.spacing.md} radius="md" style={styles.sheetGroup}>
              <DetailRow label={translate("fullNamePlaceholder")} value={deliveryProfile.data.full_name || "—"} />
              <DetailRow label={translate("checkoutPhonePlaceholder")} value={deliveryProfile.data.phone || "—"} />
            </Surface>
            <Surface elevated={false} padding={designTokens.spacing.md} radius="md" style={styles.sheetGroup}>
              <DetailRow label={translate("checkoutWilaya")} value={deliveryProfile.data.wilaya_id ? String(deliveryProfile.data.wilaya_id).padStart(2, "0") : "—"} />
              <DetailRow label={translate("checkoutCommune")} value={deliveryProfile.data.commune || "—"} />
            </Surface>
          </View>
        ) : (
          <Caption>{translate("deliveryProfileSubtitle")}</Caption>
        )}
        <Button
          label={translate("deliveryProfileManage")}
          onPress={() => {
            closeSheet();
            router.push("/delivery-profile");
          }}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet visible={activeSheet === "addresses"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("addressesTitle")}</Heading>
        {addresses.isPending ? (
          <Caption>{translate("stateLoading")}</Caption>
        ) : addresses.isError ? (
          <UiText tone="danger">{translate("addressesLoadError")}</UiText>
        ) : addresses.data.length === 0 ? (
          <Caption>{translate("addressesEmptyHint")}</Caption>
        ) : (
          <View style={styles.sheetContent}>
            {addresses.data.map((address) => (
              <Surface key={address.id} elevated={false} padding={designTokens.spacing.md} radius="md" style={styles.sheetGroup}>
                <View style={styles.addressSummaryHeader}>
                  <UiText weight="700">
                    {translate(address.label === "home" ? "addressesHome" : address.label === "work" ? "addressesWork" : "addressesOther")}
                  </UiText>
                  {address.is_default ? <Icon name="circle-check" size={17} color={theme.colors.success} /> : null}
                </View>
                <DetailRow label={translate("fullNamePlaceholder")} value={address.recipient_name} />
                <DetailRow label={translate("checkoutPhonePlaceholder")} value={address.phone} />
                <DetailRow label={translate("checkoutCommune")} value={address.commune} />
                <DetailRow label={translate("addressesStreet")} value={address.address_line} />
              </Surface>
            ))}
          </View>
        )}
        <Button
          label={translate("profileAddresses")}
          onPress={() => {
            closeSheet();
            router.push("/addresses");
          }}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet visible={activeSheet === "password"} onRequestClose={closeSheet}>
        <Heading level={3}>{translate("settingsPasswordChangeTitle")}</Heading>
        <Caption>{translate("settingsPasswordHint")}</Caption>
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
          fullWidth
        />
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
          style={styles.languageOption}
        >
          <UiText weight={language === "ar" ? "700" : "500"}>{translate("settingsLanguageArabic")}</UiText>
          {language === "ar" ? <Icon name="circle-check" size={19} color={theme.colors.success} /> : null}
        </PressableSurface>
        <PressableSurface
          accessibilityRole="button"
          accessibilityState={{ selected: language === "en" }}
          onPress={() => {
            setLanguageError(false);
            void setLanguage("en").catch(() => setLanguageError(true));
          }}
          style={styles.languageOption}
        >
          <UiText weight={language === "en" ? "700" : "500"}>{translate("settingsLanguageEnglish")}</UiText>
          {language === "en" ? <Icon name="circle-check" size={19} color={theme.colors.success} /> : null}
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
        <Icon name={icon} size={19} color={theme.colors.foregroundSecondary} />
        <UiText weight="700">{label}</UiText>
      </View>
      <Icon name="chevron-left" size={19} color={theme.colors.subtle} />
    </PressableSurface>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Caption>{label}</Caption>
      <UiText weight="700">{value}</UiText>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.md
  }
});

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
    section: {
      gap: designTokens.spacing.md
    },
    sectionContent: {
      gap: 0,
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.xs
    },
    input: {
      minHeight: designTokens.dimensions.controlHeight.lg,
      textAlign: "auto"
    },
    linkRow: {
      minHeight: 58,
      paddingVertical: designTokens.spacing.md,
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
    sheetContent: {
      gap: designTokens.spacing.md
    },
    sheetGroup: {
      gap: designTokens.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted
    },
    addressSummaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    languageOption: {
      minHeight: designTokens.dimensions.controlHeight.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: designTokens.spacing.md,
      borderRadius: designTokens.radius.md,
      backgroundColor: theme.colors.surfaceMuted
    },
    signOutButton: {
      marginTop: designTokens.spacing.sm
    }
  });
}
