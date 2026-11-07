import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchMerchantAccess } from "@/lib/merchant";
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
  const settings = useQuery({
    queryKey: ["merchant-store-settings", storeId],
    queryFn: () => fetchMyMerchantStoreSettings(storeId ?? ""),
    enabled: ready,
    retry: false
  });
  const [form, setForm] = useState<MerchantStoreSettings | null>(null);
  const [formError, setFormError] = useState(false);
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

  if (access.isPending || (ready && settings.isPending)) {
    return <Message theme={theme} label={translate("merchantLoading")} loading />;
  }
  if (access.isError || settings.isError) {
    return <Message theme={theme} label={translate("merchantStoreSettingsSaveError")} actionLabel={translate("merchantRetry")} onAction={() => { void access.refetch(); void settings.refetch(); }} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready || !form) return <Redirect href="/merchant" />;

  const update = <K extends keyof MerchantStoreSettings>(key: K, value: MerchantStoreSettings[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setFormError(false);
    mutation.reset();
  };
  const updateHours = (key: "open" | "close", value: string) => {
    update("opening_hours", { ...form.opening_hours, [key]: value });
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
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("back")}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{translate("merchantStoreSettingsTitle")}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantStoreSettingsSubtitle")}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Field label={translate("merchantStoreSettingsName")} value={form.name} onChangeText={(value) => update("name", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsDescription")} value={form.description} onChangeText={(value) => update("description", value)} theme={theme} multiline />
          <Field label={translate("merchantStoreSettingsPhone")} value={form.phone} onChangeText={(value) => update("phone", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsWhatsapp")} value={form.whatsapp} onChangeText={(value) => update("whatsapp", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsCommune")} value={form.commune} onChangeText={(value) => update("commune", value)} theme={theme} />
          <Field label={translate("merchantStoreSettingsAddress")} value={form.address_line} onChangeText={(value) => update("address_line", value)} theme={theme} />
          <View style={styles.row}>
            <View style={styles.half}><Field label={translate("merchantStoreSettingsOpen")} value={form.opening_hours.open} onChangeText={(value) => updateHours("open", value)} theme={theme} /></View>
            <View style={styles.half}><Field label={translate("merchantStoreSettingsClose")} value={form.opening_hours.close} onChangeText={(value) => updateHours("close", value)} theme={theme} /></View>
          </View>
          <Field label={translate("merchantStoreSettingsInstagram")} value={form.instagram_url} onChangeText={(value) => update("instagram_url", value)} theme={theme} keyboardType="url" />
          <Field label={translate("merchantStoreSettingsFacebook")} value={form.facebook_url} onChangeText={(value) => update("facebook_url", value)} theme={theme} keyboardType="url" />
          {formError ? <Text style={[styles.error, { color: theme.colors.danger }]}>{translate(mutation.isError ? "merchantStoreSettingsSaveError" : "merchantStoreSettingsValidation")}</Text> : null}
          {mutation.isSuccess ? <Text style={[styles.success, { color: theme.colors.success }]}>{translate("merchantStoreSettingsSaved")}</Text> : null}
          <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={submit} style={[styles.save, { backgroundColor: theme.colors.accent, opacity: mutation.isPending ? 0.6 : 1 }]}>
            {mutation.isPending ? <ActivityIndicator color={theme.colors.accentForeground} /> : <Text style={[styles.saveText, { color: theme.colors.accentForeground }]}>{translate("merchantStoreSettingsSave")}</Text>}
          </Pressable>
        </View>
      </ScrollView>
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
    <Text style={[styles.label, { color: theme.colors.foreground }]}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} multiline={multiline} maxLength={multiline ? 2000 : 300} textAlign="right" textAlignVertical={multiline ? "top" : "center"} placeholderTextColor={theme.colors.placeholder} style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }, multiline && styles.textarea]} />
  </View>;
}

function Message({ theme, label, loading = false, actionLabel, onAction }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void;
}) {
  const styles = createStyles(theme);
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
    <View style={styles.message}>
      {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
      <Text style={[styles.subtitle, { color: theme.colors.foreground }]}>{label}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} style={[styles.save, { backgroundColor: theme.colors.accent }]}><Text style={styles.saveText}>{actionLabel}</Text></Pressable> : null}
    </View>
  </SafeAreaView>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 16, paddingBottom: 36, gap: 12 },
    back: { minHeight: 42, justifyContent: "center", alignSelf: "flex-start" },
    backText: { fontSize: 12, fontWeight: "800" },
    title: { fontSize: 24, fontWeight: "900", textAlign: "right" },
    subtitle: { fontSize: 12, lineHeight: 20, textAlign: "right" },
    card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 13 },
    field: { gap: 6, flex: 1 },
    label: { fontSize: 11, fontWeight: "800", textAlign: "right" },
    input: { minHeight: 47, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 13 },
    textarea: { minHeight: 92, paddingTop: 12 },
    row: { flexDirection: "row-reverse", gap: 10 },
    half: { flex: 1 },
    error: { fontSize: 11, textAlign: "right" },
    success: { fontSize: 11, textAlign: "right", fontWeight: "800" },
    save: { minHeight: 49, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    saveText: { fontSize: 13, fontWeight: "900", color: theme.colors.foreground },
    message: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 }
  });
}
