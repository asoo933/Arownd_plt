import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CustomerHeading, CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchCheckoutCommunes, fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { fetchMyDeliveryProfile, saveMyDeliveryProfile } from "@/lib/delivery-profile";
import { DeliveryProfileSchema, normalizeAlgerianPhone, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

type Picker = "wilaya" | "commune" | null;

export default function DeliveryProfileScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const profile = useQuery({
    queryKey: ["my-delivery-profile"],
    queryFn: fetchMyDeliveryProfile
  });
  const wilayas = useQuery({
    queryKey: ["checkout-wilayas"],
    queryFn: fetchCheckoutWilayas,
    staleTime: Infinity
  });
  const communes = useQuery({
    queryKey: ["checkout-communes", wilayaId],
    queryFn: () => fetchCheckoutCommunes(wilayaId as number),
    enabled: wilayaId !== null,
    staleTime: 5 * 60 * 1000
  });
  const selectedWilaya = useMemo(
    () => wilayas.data?.find((item) => item.id === wilayaId) ?? null,
    [wilayas.data, wilayaId]
  );
  const mutation = useMutation({
    mutationFn: saveMyDeliveryProfile,
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["my-delivery-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["checkout-profile"] });
    },
    onError: () => setFormError(translate("deliveryProfileSaveError"))
  });

  useEffect(() => {
    if (!profile.isSuccess || initialized) return;
    setFullName(profile.data?.full_name ?? "");
    setPhone(profile.data?.phone ?? "");
    setWilayaId(profile.data?.wilaya_id ?? null);
    setCommune(profile.data?.commune ?? "");
    setInitialized(true);
  }, [profile.data, profile.isSuccess, initialized]);

  if (profile.isPending || wilayas.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (profile.isError || wilayas.isError) {
    return <CustomerScreen>
      <CustomerHeading title={translate("deliveryProfileTitle")} />
      <ErrorState title={translate("deliveryProfileLoadError")} retryLabel={translate("retry")} onRetry={() => { void profile.refetch(); void wilayas.refetch(); }} />
    </CustomerScreen>;
  }

  const fieldStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.foreground
    }
  ];
  const pickerStyle = [
    styles.picker,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border
    }
  ];
  const pickerItems: { id: string; label: string; wilaya?: Wilaya }[] = picker === "wilaya"
    ? (wilayas.data ?? []).map((item) => ({
        id: String(item.id),
        label: String(item.id).padStart(2, "0") + " - " + item.name_ar,
        wilaya: item
      }))
    : (communes.data ?? []).map((item) => ({ id: item, label: item }));

  const submit = () => {
    setFormError(null);
    const input: DeliveryProfileInput = {
      full_name: fullName.trim(),
      phone: normalizeAlgerianPhone(phone),
      wilaya_id: wilayaId ?? 0,
      commune: commune.trim()
    };
    const parsed = DeliveryProfileSchema.safeParse(input);
    if (!parsed.success) {
      setFormError(translate("deliveryProfileValidationError"));
      return;
    }
    mutation.mutate(parsed.data);
  };

  return <CustomerScreen>
    <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ {translate("back")}</Text></Pressable>
    <CustomerHeading title={translate("deliveryProfileTitle")} subtitle={translate("deliveryProfileSubtitle")} />
    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.label, { color: theme.colors.foreground }]}>{translate("fullNamePlaceholder")}</Text>
      <TextInput value={fullName} onChangeText={setFullName} maxLength={120} placeholder={translate("fullNamePlaceholder")} placeholderTextColor={theme.colors.placeholder} style={fieldStyle} textAlign="right" />
      <Text style={[styles.label, { color: theme.colors.foreground }]}>{translate("checkoutPhonePlaceholder")}</Text>
      <TextInput value={phone} onChangeText={setPhone} maxLength={20} keyboardType="phone-pad" placeholder={translate("checkoutPhonePlaceholder")} placeholderTextColor={theme.colors.placeholder} style={fieldStyle} textAlign="right" />
      <Text style={[styles.label, { color: theme.colors.foreground }]}>{translate("checkoutWilaya")}</Text>
      <Pressable onPress={() => setPicker("wilaya")} style={pickerStyle}>
        <Text style={[styles.pickerText, { color: selectedWilaya ? theme.colors.foreground : theme.colors.placeholder }]}>{selectedWilaya?.name_ar ?? translate("checkoutChooseWilaya")}</Text>
      </Pressable>
      <Text style={[styles.label, { color: theme.colors.foreground }]}>{translate("checkoutCommune")}</Text>
      <TextInput
        value={commune}
        onChangeText={setCommune}
        editable={wilayaId !== null}
        maxLength={100}
        placeholder={translate("checkoutCommunePlaceholder")}
        placeholderTextColor={theme.colors.placeholder}
        style={[fieldStyle, wilayaId === null && styles.disabled]}
        textAlign="right"
      />
      {(communes.data?.length ?? 0) > 0 ? <Pressable onPress={() => setPicker("commune")} style={styles.suggestionButton}>
        <Text style={styles.suggestionText}>{translate("checkoutChooseCommune")}</Text>
      </Pressable> : null}
      {communes.isError ? <Text style={styles.error}>{translate("deliveryProfileCommunesError")}</Text> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.saveButton, mutation.isPending && styles.disabled]}>
        {mutation.isPending ? <ActivityIndicator color={theme.colors.foreground} /> : <Text style={styles.saveText}>{translate("deliveryProfileSave")}</Text>}
      </Pressable>
      {mutation.isSuccess ? <Text style={styles.success}>{translate("deliveryProfileSaved")}</Text> : null}
    </View>
    <Text style={styles.note}>{translate("deliveryProfileDefaultAreaNote")}</Text>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={styles.backdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.modalTitle}>{picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune")}</Text>
          {picker === "commune" && communes.isPending ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
          {picker === "commune" && communes.isError ? <Text style={styles.error}>{translate("deliveryProfileCommunesError")}</Text> : null}
          <ScrollView style={styles.options}>
            {pickerItems.map((item) => <Pressable key={item.id} onPress={() => {
              if (picker === "wilaya" && item.wilaya) {
                setWilayaId(item.wilaya.id);
                setCommune("");
              } else if (picker === "commune") {
                setCommune(item.label);
              }
              setPicker(null);
            }} style={styles.option}>
              <Text style={[styles.optionText, { color: theme.colors.foreground }]}>{item.label}</Text>
            </Pressable>)}
          </ScrollView>
          <Pressable onPress={() => setPicker(null)} style={styles.closeButton}><Text style={styles.closeText}>{translate("back")}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  back: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  panel: { borderRadius: 18, padding: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 13 },
  picker: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, justifyContent: "center" },
  pickerText: { textAlign: "right", fontSize: 13 },
  suggestionButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center" },
  suggestionText: { color: theme.colors.accentMuted, fontSize: 11, fontWeight: "800" },
  saveButton: { minHeight: 49, borderRadius: 13, backgroundColor: theme.colors.accent, justifyContent: "center", alignItems: "center", marginTop: 5 },
  saveText: { color: theme.colors.foreground, fontSize: 13, fontWeight: "900" },
  error: { color: theme.colors.danger, fontSize: 11, textAlign: "right" },
  success: { color: theme.colors.accentMuted, fontSize: 12, textAlign: "right", fontWeight: "800" },
  note: { color: theme.colors.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "center", padding: 18 },
  modalPanel: { maxHeight: "80%", borderRadius: 18, padding: 16, gap: 12 },
  modalTitle: { color: theme.colors.accentMuted, fontSize: 14, fontWeight: "900", textAlign: "right" },
  options: { maxHeight: 440 },
  option: { minHeight: 45, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionText: { textAlign: "right", fontSize: 13 },
  closeButton: { minHeight: 42, justifyContent: "center", alignItems: "center", borderRadius: 11, backgroundColor: theme.colors.accent },
  closeText: { color: theme.colors.foreground, fontWeight: "900", fontSize: 12 }
}); }

