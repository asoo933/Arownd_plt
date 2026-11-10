import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet, AppHeader, Button, Card, ErrorState, Heading, Icon, IconButton, Image as UiImage, LoadingState, PressableSurface, Text as UiText, TextField } from "@/components/ui";
import { fetchMerchantAccess } from "@/lib/merchant";
import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { STORE_IMAGE_MAX_BYTES, uploadMerchantStoreImage, validateStoreImageAsset } from "@/lib/merchant-store-images";
import { fetchMyMerchantStoreSettings, updateMyMerchantStoreSettings } from "@/lib/merchant-store-settings";
import { MerchantStoreSettingsSchema, type MerchantStoreSettings } from "@/lib/merchant-store-settings-state";
import { translate, useLanguage } from "@/lib/i18n";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantStoreSettingsScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const access = useQuery({ queryKey: ["merchant-access"], queryFn: fetchMerchantAccess, retry: false });
  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && Boolean(storeId);
  const wilayas = useQuery({ queryKey: ["merchant-wilayas"], queryFn: fetchCheckoutWilayas, staleTime: Infinity });
  const settings = useQuery({
    queryKey: ["merchant-store-settings", storeId],
    queryFn: () => fetchMyMerchantStoreSettings(storeId ?? ""),
    enabled: ready,
    retry: false
  });
  const [form, setForm] = useState<MerchantStoreSettings | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [formError, setFormError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [wilayaPickerOpen, setWilayaPickerOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState<"logo" | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const [imageCleanupPending, setImageCleanupPending] = useState(false);
  const mutation = useMutation({
    mutationFn: (values: MerchantStoreSettings) => updateMyMerchantStoreSettings(storeId ?? "", values),
    onSuccess: async (_data, values) => {
      queryClient.setQueryData<MerchantStoreSettings>(["merchant-store-settings", storeId], values);
      setForm(values);
      setFormDirty(false);
      setFormError(false);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] });
    },
    onError: () => setFormError(true)
  });

  useEffect(() => {
    if (settings.data && !formDirty) setForm(settings.data);
  }, [settings.data, formDirty]);

  if (access.isPending || wilayas.isPending || (ready && settings.isPending)) {
    return <Message theme={theme} label={translate("merchantLoading")} loading />;
  }
  if (access.isError || wilayas.isError || settings.isError) {
    return <Message theme={theme} label={translate("merchantStoreSettingsSaveError")} actionLabel={translate("merchantRetry")} busy={access.isFetching || wilayas.isFetching || settings.isFetching} onAction={() => { void access.refetch(); void wilayas.refetch(); void settings.refetch(); }} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready || !form) return <Redirect href="/merchant" />;

  const selectedWilaya = wilayas.data?.find((item) => item.id === form.wilaya_id);
  const selectWilaya = (wilaya: Wilaya) => {
    if (mutation.isPending) return;
    setForm((current) => current ? { ...current, wilaya_id: wilaya.id, commune: "" } : current);
    setFormDirty(true);
    setWilayaPickerOpen(false);
    setFormError(false);
    setFieldErrors({});
    mutation.reset();
  };
  const update = <K extends keyof MerchantStoreSettings>(key: K, value: MerchantStoreSettings[K]) => {
    if (mutation.isPending) return;
    setForm((current) => current ? { ...current, [key]: value } : current);
    setFormDirty(true);
    setFormError(false);
    setFieldErrors({});
    mutation.reset();
  };
  const updateHours = (key: "open" | "close", value: string) => {
    update("opening_hours", { ...form.opening_hours, [key]: value });
  };
  const weekdays = [
    { value: 6, key: "merchantWeekdaySaturday" },
    { value: 0, key: "merchantWeekdaySunday" },
    { value: 1, key: "merchantWeekdayMonday" },
    { value: 2, key: "merchantWeekdayTuesday" },
    { value: 3, key: "merchantWeekdayWednesday" },
    { value: 4, key: "merchantWeekdayThursday" },
    { value: 5, key: "merchantWeekdayFriday" }
  ] as const;
  const toggleClosedDay = (day: number) => {
    if (mutation.isPending) return;
    const closedDays = form.opening_hours.closed_days.includes(day)
      ? form.opening_hours.closed_days.filter((item) => item !== day)
      : [...form.opening_hours.closed_days, day];
    update("opening_hours", { ...form.opening_hours, closed_days: closedDays });
  };
  const chooseStoreImage = async () => {
    if (!storeId || imageBusy || mutation.isPending) return;
    setImageBusy("logo");
    setImageError(false);
    setImageSaved(false);
    setImageCleanupPending(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.85
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.fileSize !== null && asset.fileSize !== undefined && asset.fileSize > STORE_IMAGE_MAX_BYTES) {
        setImageError(true);
        return;
      }
      if (!validateStoreImageAsset(asset)) {
        setImageError(true);
        return;
      }
      const uploaded = await uploadMerchantStoreImage(storeId, asset, "logo");
      setForm((current) => current ? { ...current, logo_url: uploaded.url } : current);
      queryClient.setQueryData<MerchantStoreSettings>(
        ["merchant-store-settings", storeId],
        (current) => current ? { ...current, logo_url: uploaded.url } : current
      );
      setImageSaved(true);
      setImageCleanupPending(uploaded.cleanupPending);
    } catch {
      setImageError(true);
    } finally {
      setImageBusy(null);
    }
  };
  const submit = () => {
    if (imageBusy || mutation.isPending) return;
    const parsed = MerchantStoreSettingsSchema.safeParse(form);
    if (!parsed.success) {
      const nextFieldErrors = parsed.error.issues.reduce<Record<string, boolean>>((errors, issue) => {
        errors[issue.path.join(".")] = true;
        return errors;
      }, {});
      setFieldErrors(nextFieldErrors);
      setFormError(true);
      return;
    }
    setFieldErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader
          title={translate("merchantStoreSettingsTitle")}
          leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name={language === "ar" ? "chevron-right" : "chevron-left"} color={theme.colors.foreground} size={20} />} />}
        />
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantStoreSettingsSubtitle")}</UiText>

        <Card contentStyle={styles.sectionCard}>
          <Heading level={3}>{translate("merchantStoreLogo")}</Heading>
          <View style={styles.brandingRow}>
            {form.logo_url ? (
              <UiImage uri={form.logo_url} accessibilityLabel={translate("merchantStoreLogo")} aspectRatio={1} style={styles.logoPreview} />
            ) : (
              <View style={[styles.logoPreview, styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Icon name="store" color={theme.colors.muted} size={28} accessibilityHidden />
              </View>
            )}
            <View style={styles.brandingDetails}>
              <UiText style={[styles.brandingHint, { color: theme.colors.muted }]}>{translate("merchantStoreLogo")}</UiText>
              <Button
                label={translate("merchantStoreImageUpload")}
                onPress={() => void chooseStoreImage()}
                loading={imageBusy === "logo"}
                disabled={imageBusy !== null || mutation.isPending}
                variant="outline"
                size="sm"
              />
            </View>
          </View>
          {imageError ? <UiText style={[styles.error, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{translate("merchantStoreImageUploadError")}</UiText> : null}
          {imageSaved ? <UiText style={[styles.success, { color: theme.mode === "light" ? theme.colors.successText : theme.colors.success }]}>{translate("merchantStoreImageSaved")}</UiText> : null}
          {imageCleanupPending ? <UiText style={[styles.error, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{translate("merchantStoreImageCleanupPending")}</UiText> : null}
        </Card>

        <Card contentStyle={styles.sectionCard}>
          <Heading level={3}>{translate("merchantStoreDetailsTitle")}</Heading>
          <Field label={translate("merchantStoreSettingsName")} value={form.name} onChangeText={(value) => update("name", value)} theme={theme} disabled={mutation.isPending} error={fieldErrors.name} />
          <Field label={translate("merchantStoreSettingsDescription")} value={form.description} onChangeText={(value) => update("description", value)} theme={theme} multiline disabled={mutation.isPending} error={fieldErrors.description} />
          <Field label={translate("merchantStoreSettingsPhone")} value={form.phone} onChangeText={(value) => update("phone", value)} theme={theme} disabled={mutation.isPending} error={fieldErrors.phone} />
          <Field label={translate("merchantStoreSettingsWhatsapp")} value={form.whatsapp} onChangeText={(value) => update("whatsapp", value)} theme={theme} disabled={mutation.isPending} error={fieldErrors.whatsapp} />
        </Card>

        <Card contentStyle={styles.sectionCard}>
          <Heading level={3}>{translate("merchantStoreLocationTitle")}</Heading>
          <View style={styles.field}>
            <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreWilayaLabel")}</UiText>
            <PressableSurface accessibilityRole="button" accessibilityLabel={translate("merchantStoreWilayaLabel")} onPress={() => setWilayaPickerOpen(true)} disabled={mutation.isPending} style={[styles.input, styles.select, { backgroundColor: theme.colors.background, borderColor: theme.colors.inputBorder }]}>
              <UiText style={{ color: theme.colors.foreground, fontSize: designTokens.typography.body - 1, textAlign: "auto" }}>{selectedWilaya ? `${String(selectedWilaya.id).padStart(2, "0")} - ${getLocalizedWilayaLabel(selectedWilaya.id, selectedWilaya.name_ar, language, selectedWilaya.name_fr)}` : translate("merchantStoreChooseWilaya")}</UiText>
            </PressableSurface>
            {fieldErrors.wilaya_id ? <UiText style={[styles.error, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{translate("merchantStoreSettingsValidation")}</UiText> : null}
          </View>
          <Field label={translate("merchantStoreSettingsCommune")} value={form.commune} onChangeText={(value) => update("commune", value)} theme={theme} disabled={mutation.isPending} error={fieldErrors.commune} />
          <Field label={translate("merchantStoreSettingsAddress")} value={form.address_line} onChangeText={(value) => update("address_line", value)} theme={theme} disabled={mutation.isPending} error={fieldErrors.address_line} />
        </Card>

        <Card contentStyle={styles.sectionCard}>
          <Heading level={3}>{translate("merchantStoreHoursTitle")}</Heading>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label={translate("merchantStoreSettingsOpen")} value={form.opening_hours.open} onChangeText={(value) => updateHours("open", value)} theme={theme} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="HH:MM" disabled={mutation.isPending} error={fieldErrors["opening_hours.open"]} />
            </View>
            <View style={styles.half}>
              <Field label={translate("merchantStoreSettingsClose")} value={form.opening_hours.close} onChangeText={(value) => updateHours("close", value)} theme={theme} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="HH:MM" disabled={mutation.isPending} error={fieldErrors["opening_hours.close"]} />
            </View>
          </View>
          <UiText style={[styles.hint, { color: theme.colors.muted }]}>HH:MM</UiText>
          {fieldErrors["opening_hours.closed_days"] ? <UiText style={[styles.error, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{translate("merchantStoreSettingsValidation")}</UiText> : null}
          <View style={styles.field}>
            <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreSettingsClosedDays")}</UiText>
            <View style={styles.days}>
              {weekdays.map((day) => {
                const selected = form.opening_hours.closed_days.includes(day.value);
                return <PressableSurface key={day.value} accessibilityRole="button" accessibilityLabel={translate(day.key)} accessibilityState={{ selected }} onPress={() => toggleClosedDay(day.value)} disabled={mutation.isPending} style={[styles.dayChip, { borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? (theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceSecondary) : theme.colors.background }]}>
                  <UiText style={[styles.dayChipText, { color: selected ? (theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted) : theme.colors.foreground }]}>{translate(day.key)}</UiText>
                </PressableSurface>;
              })}
            </View>
          </View>
        </Card>

        <Card contentStyle={styles.sectionCard}>
          <Heading level={3}>{translate("merchantStoreSocialTitle")}</Heading>
          <Field label={translate("merchantStoreSettingsInstagram")} value={form.instagram_url} onChangeText={(value) => update("instagram_url", value)} theme={theme} keyboardType="url" disabled={mutation.isPending} error={fieldErrors.instagram_url} />
          <Field label={translate("merchantStoreSettingsFacebook")} value={form.facebook_url} onChangeText={(value) => update("facebook_url", value)} theme={theme} keyboardType="url" disabled={mutation.isPending} error={fieldErrors.facebook_url} />
        </Card>

        {formError ? <UiText style={[styles.error, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{translate(mutation.isError ? "merchantStoreSettingsSaveError" : "merchantStoreSettingsValidation")}</UiText> : null}
        {mutation.isSuccess ? <UiText style={[styles.success, { color: theme.mode === "light" ? theme.colors.successText : theme.colors.success }]}>{translate("merchantStoreSettingsSaved")}</UiText> : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <Button label={translate("merchantStoreSettingsSave")} onPress={submit} loading={mutation.isPending} disabled={imageBusy !== null || mutation.isPending} fullWidth />
      </View>

      <BottomSheet visible={wilayaPickerOpen} onRequestClose={() => setWilayaPickerOpen(false)} maxHeight="85%">
        <View style={styles.modalHeader}>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantStoreWilayaLabel")}</UiText>
          <PressableSurface accessibilityRole="button" accessibilityLabel={translate("merchantProductCategoryClose")} onPress={() => setWilayaPickerOpen(false)} hitSlop={10}>
            <UiText style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("merchantProductCategoryClose")}</UiText>
          </PressableSurface>
        </View>
        <ScrollView style={styles.wilayaList} keyboardShouldPersistTaps="handled">
          {(wilayas.data ?? []).map((wilaya) => (
            <PressableSurface key={wilaya.id} accessibilityRole="button" accessibilityLabel={String(wilaya.id).padStart(2, "0") + " - " + getLocalizedWilayaLabel(wilaya.id, wilaya.name_ar, language, wilaya.name_fr)} accessibilityState={{ selected: wilaya.id === form.wilaya_id }} onPress={() => selectWilaya(wilaya)} style={[styles.wilayaOption, { borderBottomColor: theme.colors.border, backgroundColor: wilaya.id === form.wilaya_id ? (theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceMuted) : "transparent" }]}>
              <UiText style={[styles.wilayaText, { color: wilaya.id === form.wilaya_id && theme.mode === "dark" ? theme.colors.accentMuted : theme.colors.foreground }]}>{String(wilaya.id).padStart(2, "0")} - {getLocalizedWilayaLabel(wilaya.id, wilaya.name_ar, language, wilaya.name_fr)}</UiText>
            </PressableSurface>
          ))}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, theme, multiline = false, keyboardType = "default", maxLength, placeholder, disabled = false, error = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: AppTheme;
  multiline?: boolean;
  keyboardType?: "default" | "url" | "numbers-and-punctuation";
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | undefined;
}) {
  const styles = createStyles(theme);
  return <View style={styles.field}>
    <UiText style={[styles.label, { color: theme.colors.foreground }]}>{label}</UiText>
    <TextField accessibilityLabel={label} value={value} onChangeText={onChangeText} editable={!disabled} keyboardType={keyboardType} multiline={multiline} maxLength={maxLength ?? (multiline ? 2000 : 300)} placeholder={placeholder} textAlign="auto" textAlignVertical={multiline ? "top" : "center"} placeholderTextColor={theme.colors.placeholder} error={error ? translate("merchantStoreSettingsValidation") : undefined} style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background }, multiline && styles.textarea]} />
  </View>;
}

function Message({ theme, label, loading = false, actionLabel, onAction, busy = false }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void; busy?: boolean;
}) {
  const styles = createStyles(theme);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? (
          <LoadingState label={label} />
        ) : actionLabel && onAction ? (
          <ErrorState title={label} retryLabel={actionLabel} busy={busy} onRetry={onAction} />
        ) : (
          <UiText style={[styles.subtitle, { color: theme.colors.foreground }]}>{label}</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: designTokens.spacing.lg, paddingBottom: designTokens.spacing.lg, gap: designTokens.spacing.md },
    sectionCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
    footer: { paddingHorizontal: designTokens.spacing.lg, paddingVertical: designTokens.spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
    backText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 20, textAlign: "auto" },
    select: { justifyContent: "center" },
    brandingRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
    brandingDetails: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.sm },
    brandingHint: { fontSize: designTokens.typography.caption, textAlign: "auto" },
    logoPreview: { width: 88, height: 88, borderRadius: designTokens.radius.pill },
    hint: { fontSize: designTokens.typography.caption, textAlign: "auto" },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold },
    wilayaList: { maxHeight: 480 },
    wilayaOption: { minHeight: designTokens.dimensions.controlHeight.lg, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: designTokens.spacing.sm },
    wilayaText: { textAlign: "auto", fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.bold },
    field: { gap: designTokens.spacing.xs, flex: 1 },
    label: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    input: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, fontSize: designTokens.typography.body - 1 },
    textarea: { minHeight: 92, paddingTop: 12 },
    row: { flexDirection: "row", gap: designTokens.spacing.md },
    half: { flex: 1 },
    days: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
    dayChip: { minHeight: 38, minWidth: 65, paddingHorizontal: designTokens.spacing.sm, borderWidth: 1, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    dayChipText: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold },
    error: { fontSize: designTokens.typography.caption, textAlign: "auto" },
    success: { fontSize: designTokens.typography.caption, textAlign: "auto", fontWeight: designTokens.fontWeights.extrabold },
    message: { flex: 1, justifyContent: "center", alignItems: "center", padding: designTokens.spacing.xxl, gap: designTokens.spacing.lg }
  });
}
