import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, Button, Card, ErrorState, Icon, IconButton, Image as UiImage, LoadingState, PressableSurface, Text as UiText, TextField } from "@/components/ui";
import { fetchMerchantAccess } from "@/lib/merchant";
import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { STORE_IMAGE_MAX_BYTES, uploadMerchantStoreImage, validateStoreImageAsset } from "@/lib/merchant-store-images";
import { fetchMyMerchantStoreSettings, updateMyMerchantStoreSettings } from "@/lib/merchant-store-settings";
import { MerchantStoreSettingsSchema, type MerchantStoreSettings } from "@/lib/merchant-store-settings-state";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantStoreSettingsScreen() {
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
  const [formError, setFormError] = useState(false);
  const [wilayaPickerOpen, setWilayaPickerOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState<"logo" | "cover" | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const [imageCleanupPending, setImageCleanupPending] = useState(false);
  const mutation = useMutation({
    mutationFn: (values: MerchantStoreSettings) => updateMyMerchantStoreSettings(storeId ?? "", values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["merchant-store-settings", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] });
      setFormError(false);
    },
    onError: () => setFormError(true)
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  if (access.isPending || wilayas.isPending || (ready && settings.isPending)) {
    return <Message theme={theme} label={translate("merchantLoading")} loading />;
  }
  if (access.isError || wilayas.isError || settings.isError) {
    return <Message theme={theme} label={translate("merchantStoreSettingsSaveError")} actionLabel={translate("merchantRetry")} onAction={() => { void access.refetch(); void wilayas.refetch(); void settings.refetch(); }} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready || !form) return <Redirect href="/merchant" />;

  const selectedWilaya = wilayas.data?.find((item) => item.id === form.wilaya_id);
  const selectWilaya = (wilaya: Wilaya) => {
    setForm((current) => current ? { ...current, wilaya_id: wilaya.id, commune: "" } : current);
    setWilayaPickerOpen(false);
    setFormError(false);
    mutation.reset();
  };
  const update = <K extends keyof MerchantStoreSettings>(key: K, value: MerchantStoreSettings[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setFormError(false);
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
    const closedDays = form.opening_hours.closed_days.includes(day)
      ? form.opening_hours.closed_days.filter((item) => item !== day)
      : [...form.opening_hours.closed_days, day];
    update("opening_hours", { ...form.opening_hours, closed_days: closedDays });
  };
  const chooseStoreImage = async (kind: "logo" | "cover") => {
    if (!storeId || imageBusy || mutation.isPending) return;
    setImageBusy(kind);
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
      const uploaded = await uploadMerchantStoreImage(storeId, asset, kind);
      setForm((current) => current ? { ...current, [kind === "logo" ? "logo_url" : "cover_url"]: uploaded.url } : current);
      await queryClient.invalidateQueries({ queryKey: ["merchant-store-settings", storeId] });
      setImageSaved(true);
      setImageCleanupPending(uploaded.cleanupPending);
    } catch {
      setImageError(true);
    } finally {
      setImageBusy(null);
    }
  };
  const submit = () => {
    const parsed = MerchantStoreSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(true);
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader
          title={translate("merchantStoreSettingsTitle")}
          leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={20} />} />}
        />
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantStoreSettingsSubtitle")}</UiText>
        <Card contentStyle={styles.card}>
          <View style={styles.brandingRow}>
            <View style={styles.brandingItem}>
              <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreLogo")}</UiText>
              {form.logo_url ? <UiImage uri={form.logo_url} accessibilityLabel={translate("merchantStoreLogo")} aspectRatio={1} style={styles.logoPreview} /> : <View style={[styles.logoPreview, styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceMuted }]}><Icon name="image" color={theme.colors.muted} size={24} accessibilityHidden /></View>}
              <Button
                label={translate("merchantStoreImageUpload")}
                onPress={() => void chooseStoreImage("logo")}
                loading={imageBusy === "logo"}
                disabled={imageBusy !== null}
                variant="outline"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.brandingItem}>
              <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreCover")}</UiText>
              {form.cover_url ? <UiImage uri={form.cover_url} accessibilityLabel={translate("merchantStoreCover")} aspectRatio={16 / 5} style={styles.coverPreview} /> : <View style={[styles.coverPreview, styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceMuted }]}><Icon name="image" color={theme.colors.muted} size={24} accessibilityHidden /></View>}
              <Button
                label={translate("merchantStoreImageUpload")}
                onPress={() => void chooseStoreImage("cover")}
                loading={imageBusy === "cover"}
                disabled={imageBusy !== null}
                variant="outline"
                size="sm"
                fullWidth
              />
            </View>
          </View>
          {imageError ? <UiText style={[styles.error, { color: theme.colors.danger }]}>{translate("merchantStoreImageUploadError")}</UiText> : null}
          {imageSaved ? <UiText style={[styles.success, { color: theme.colors.success }]}>{translate("merchantStoreImageSaved")}</UiText> : null}
          {imageCleanupPending ? <UiText style={[styles.error, { color: theme.colors.danger }]}>{translate("merchantStoreImageCleanupPending")}</UiText> : null}
          <Field label={translate("merchantStoreSettingsName")} value={form.name} onChangeText={(value) => update("name", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsDescription")} value={form.description} onChangeText={(value) => update("description", value)} theme={theme} multiline />
          <Field label={translate("merchantStoreSettingsPhone")} value={form.phone} onChangeText={(value) => update("phone", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsWhatsapp")} value={form.whatsapp} onChangeText={(value) => update("whatsapp", value)} theme={theme} />
          <View style={styles.field}>
            <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreWilayaLabel")}</UiText>
            <PressableSurface accessibilityRole="button" onPress={() => setWilayaPickerOpen(true)} style={[styles.input, styles.select, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <UiText style={{ color: theme.colors.foreground, fontSize: 13, textAlign: "right" }}>{selectedWilaya ? `${String(selectedWilaya.id).padStart(2, "0")} - ${selectedWilaya.name_ar}` : translate("merchantStoreChooseWilaya")}</UiText>
            </PressableSurface>
          </View>
          <Field label={translate("merchantStoreSettingsCommune")} value={form.commune} onChangeText={(value) => update("commune", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsAddress")} value={form.address_line} onChangeText={(value) => update("address_line", value)} theme={theme} />
          <View style={styles.row}>
            <View style={styles.half}><Field label={translate("merchantStoreSettingsOpen")} value={form.opening_hours.open} onChangeText={(value) => updateHours("open", value)} theme={theme} /></View>
            <View style={styles.half}><Field label={translate("merchantStoreSettingsClose")} value={form.opening_hours.close} onChangeText={(value) => updateHours("close", value)} theme={theme} /></View>
          </View>
          <View style={styles.field}>
            <UiText style={[styles.label, { color: theme.colors.foreground }]}>{translate("merchantStoreSettingsClosedDays")}</UiText>
            <View style={styles.days}>
              {weekdays.map((day) => {
                const selected = form.opening_hours.closed_days.includes(day.value);
                return <PressableSurface key={day.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggleClosedDay(day.value)} style={[styles.dayChip, { borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? theme.colors.accent : theme.colors.background }]}>
                  <UiText style={[styles.dayChipText, { color: selected ? theme.colors.accentForeground : theme.colors.foreground }]}>{translate(day.key)}</UiText>
                </PressableSurface>;
              })}
            </View>
          </View>
          <Field label={translate("merchantStoreSettingsInstagram")} value={form.instagram_url} onChangeText={(value) => update("instagram_url", value)} theme={theme} keyboardType="url" />
          <Field label={translate("merchantStoreSettingsFacebook")} value={form.facebook_url} onChangeText={(value) => update("facebook_url", value)} theme={theme} keyboardType="url" />
          {formError ? <UiText style={[styles.error, { color: theme.colors.danger }]}>{translate(mutation.isError ? "merchantStoreSettingsSaveError" : "merchantStoreSettingsValidation")}</UiText> : null}
          {mutation.isSuccess ? <UiText style={[styles.success, { color: theme.colors.success }]}>{translate("merchantStoreSettingsSaved")}</UiText> : null}
          <Button label={translate("merchantStoreSettingsSave")} onPress={submit} loading={mutation.isPending} fullWidth />
        </Card>
      </ScrollView>
      <BottomSheet visible={wilayaPickerOpen} onRequestClose={() => setWilayaPickerOpen(false)} maxHeight="85%">
            <View style={styles.modalHeader}>
              <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantStoreWilayaLabel")}</UiText>
              <PressableSurface accessibilityRole="button" onPress={() => setWilayaPickerOpen(false)} hitSlop={10}>
                <UiText style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("merchantProductCategoryClose")}</UiText>
              </PressableSurface>
            </View>
            <ScrollView style={styles.wilayaList} keyboardShouldPersistTaps="handled">
              {(wilayas.data ?? []).map((wilaya) => (
                <PressableSurface key={wilaya.id} accessibilityRole="button" accessibilityState={{ selected: wilaya.id === form.wilaya_id }} onPress={() => selectWilaya(wilaya)} style={[styles.wilayaOption, { borderBottomColor: theme.colors.border, backgroundColor: wilaya.id === form.wilaya_id ? theme.colors.surfaceMuted : "transparent" }]}>
                  <UiText style={[styles.wilayaText, { color: theme.colors.foreground }]}>{String(wilaya.id).padStart(2, "0")} - {wilaya.name_ar}</UiText>
                </PressableSurface>
              ))}
            </ScrollView>

      </BottomSheet>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, theme, multiline = false, keyboardType = "default" }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: AppTheme;
  multiline?: boolean;
  keyboardType?: "default" | "url";
}) {
  const styles = createStyles(theme);
  return <View style={styles.field}>
    <UiText style={[styles.label, { color: theme.colors.foreground }]}>{label}</UiText>
    <TextField value={value} onChangeText={onChangeText} keyboardType={keyboardType} multiline={multiline} maxLength={multiline ? 2000 : 300} textAlign="right" textAlignVertical={multiline ? "top" : "center"} placeholderTextColor={theme.colors.placeholder} style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }, multiline && styles.textarea]} />
  </View>;
}

function Message({ theme, label, loading = false, actionLabel, onAction }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void;
}) {
  const styles = createStyles(theme);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? (
          <LoadingState label={label} />
        ) : actionLabel && onAction ? (
          <ErrorState title={label} retryLabel={actionLabel} onRetry={onAction} />
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
    content: { padding: 16, paddingBottom: 36, gap: 12 },
    backText: { fontSize: 12, fontWeight: "800" },
    subtitle: { fontSize: 12, lineHeight: 20, textAlign: "right" },
    card: { padding: 15, gap: 13 },
    select: { justifyContent: "center" },
    brandingRow: { flexDirection: "row-reverse", gap: 12 },
    brandingItem: { flex: 1, gap: 8 },
    logoPreview: { width: 76, height: 76, borderRadius: 14, alignSelf: "flex-end" },
    coverPreview: { width: "100%", height: 76, borderRadius: 14 },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    modalOverlay: { flex: 1, justifyContent: "flex-end", padding: 12 },
    modalCard: { maxHeight: "78%", borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
    modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 14, fontWeight: "900" },
    wilayaList: { maxHeight: 480 },
    wilayaOption: { minHeight: 48, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
    wilayaText: { textAlign: "right", fontSize: 13, fontWeight: "700" },
    field: { gap: 6, flex: 1 },
    label: { fontSize: 11, fontWeight: "800", textAlign: "right" },
    input: { minHeight: 47, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 13 },
    textarea: { minHeight: 92, paddingTop: 12 },
    row: { flexDirection: "row-reverse", gap: 10 },
    half: { flex: 1 },
    days: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
    dayChip: { minHeight: 38, minWidth: 65, paddingHorizontal: 9, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    dayChipText: { fontSize: 10, fontWeight: "800" },
    error: { fontSize: 11, textAlign: "right" },
    success: { fontSize: 11, textAlign: "right", fontWeight: "800" },
    message: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 }
  });
}
