import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, Caption, FormLabel, Heading, Icon, IconButton, PressableSurface, Text as UiText, TextField } from "@/components/ui";
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
      <AppHeader title={translate("deliveryProfileTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />} />
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

  const clearSaveFeedback = () => {
    setFormError(null);
    mutation.reset();
  };

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
    <AppHeader title={translate("deliveryProfileTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />} />
    <Caption>{translate("deliveryProfileSubtitle")}</Caption>
    <Card style={styles.panel} contentStyle={{ gap: 10 }}>
      <Heading level={3}>{translate("deliveryProfileTitle")}</Heading>
      <FormLabel>{translate("fullNamePlaceholder")}</FormLabel>
      <TextField value={fullName} onChangeText={(value) => { setFullName(value); clearSaveFeedback(); }} maxLength={120} placeholder={translate("fullNamePlaceholder")} style={fieldStyle} textAlign="right" />
      <FormLabel>{translate("checkoutPhonePlaceholder")}</FormLabel>
      <TextField value={phone} onChangeText={(value) => { setPhone(value); clearSaveFeedback(); }} maxLength={20} keyboardType="phone-pad" placeholder={translate("checkoutPhonePlaceholder")} style={fieldStyle} textAlign="right" />
      <FormLabel>{translate("checkoutWilaya")}</FormLabel>
      <PressableSurface onPress={() => setPicker("wilaya")} style={pickerStyle}>
        <UiText tone={selectedWilaya ? "foreground" : "muted"}>{selectedWilaya?.name_ar ?? translate("checkoutChooseWilaya")}</UiText>
      </PressableSurface>
      <FormLabel>{translate("checkoutCommune")}</FormLabel>
      <TextField
        value={commune}
        onChangeText={(value) => { setCommune(value); clearSaveFeedback(); }}
        editable={wilayaId !== null}
        maxLength={100}
        placeholder={translate("checkoutCommunePlaceholder")}
        style={[...fieldStyle, wilayaId === null && styles.disabled]}
        textAlign="right"
      />
      {(communes.data?.length ?? 0) > 0 ? <PressableSurface onPress={() => setPicker("commune")} style={styles.suggestionButton}>
        <UiText tone="accentMuted" weight="700">{translate("checkoutChooseCommune")}</UiText>
      </PressableSurface> : null}
      {communes.isError ? <UiText tone="danger">{translate("deliveryProfileCommunesError")}</UiText> : null}
      {formError ? <UiText tone="danger">{formError}</UiText> : null}
      <Button label={translate("deliveryProfileSave")} onPress={submit} loading={mutation.isPending} fullWidth />
      {mutation.isSuccess ? <UiText tone="success" weight="700">{translate("deliveryProfileSaved")}</UiText> : null}
    </Card>
    <Caption>{translate("deliveryProfileDefaultAreaNote")}</Caption>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={styles.backdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.modalTitle}>{picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune")}</Text>
          {picker === "commune" && communes.isPending ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
          {picker === "commune" && communes.isError ? <Text style={styles.error}>{translate("deliveryProfileCommunesError")}</Text> : null}
          <ScrollView style={styles.options}>
            {pickerItems.map((item) => <PressableSurface key={item.id} onPress={() => {
              if (picker === "wilaya" && item.wilaya) {
                setWilayaId(item.wilaya.id);
                setCommune("");
                clearSaveFeedback();
              } else if (picker === "commune") {
                setCommune(item.label);
              }
              setPicker(null);
            }} style={styles.option}>
              <Text style={[styles.optionText, { color: theme.colors.foreground }]}>{item.label}</Text>
            </PressableSurface>)}
          </ScrollView>
          <PressableSurface onPress={() => setPicker(null)} style={styles.closeButton}><Text style={styles.closeText}>{translate("back")}</Text></PressableSurface>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  panel: { borderRadius: 18, padding: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 13 },
  picker: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, justifyContent: "center" },
  pickerText: { textAlign: "right", fontSize: 13 },
  suggestionButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center" },
  suggestionText: { color: theme.colors.accentMuted, fontSize: 11, fontWeight: "800" },
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

