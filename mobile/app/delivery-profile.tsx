import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, Caption, FormLabel, Heading, Icon, IconButton, PressableSurface, Spinner, Text as UiText, TextField } from "@/components/ui";
import { fetchCheckoutCommunes, fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { fetchMyDeliveryProfile, saveMyDeliveryProfile } from "@/lib/delivery-profile";
import { DeliveryProfileSchema, normalizeAlgerianPhone, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";

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
    <AppHeader title={translate("deliveryProfileTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />} />
    <Caption>{translate("deliveryProfileSubtitle")}</Caption>
    <Card style={styles.panel} contentStyle={{ gap: designTokens.spacing.md, padding: designTokens.spacing.lg }}>
      <Heading level={3}>{translate("deliveryProfileTitle")}</Heading>
      <FormLabel>{translate("fullNamePlaceholder")}</FormLabel>
      <TextField value={fullName} onChangeText={(value) => { setFullName(value); clearSaveFeedback(); }} maxLength={120} placeholder={translate("fullNamePlaceholder")} style={fieldStyle} textAlign="right" />
      <FormLabel>{translate("checkoutPhonePlaceholder")}</FormLabel>
      <TextField value={phone} onChangeText={(value) => { setPhone(value); clearSaveFeedback(); }} maxLength={20} keyboardType="phone-pad" placeholder={translate("checkoutPhonePlaceholder")} style={fieldStyle} textAlign="right" />
      <FormLabel>{translate("checkoutWilaya")}</FormLabel>
      <PressableSurface accessibilityLabel={translate("checkoutWilaya")} onPress={() => setPicker("wilaya")} style={pickerStyle}>
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
      {(communes.data?.length ?? 0) > 0 ? <PressableSurface accessibilityLabel={translate("checkoutChooseCommune")} onPress={() => setPicker("commune")} style={styles.suggestionButton}>
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
          <UiText weight="800" style={styles.modalTitle}>{picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune")}</UiText>
          {picker === "commune" && communes.isPending ? <Spinner size="small" /> : null}
          {picker === "commune" && communes.isError ? <UiText tone="danger">{translate("deliveryProfileCommunesError")}</UiText> : null}
          <ScrollView style={styles.options}>
            {pickerItems.map((item) => <PressableSurface key={item.id} accessibilityLabel={item.label} onPress={() => {
              if (picker === "wilaya" && item.wilaya) {
                setWilayaId(item.wilaya.id);
                setCommune("");
                clearSaveFeedback();
              } else if (picker === "commune") {
                setCommune(item.label);
              }
              setPicker(null);
            }} style={styles.option}>
              <UiText style={styles.optionText}>{item.label}</UiText>
            </PressableSurface>)}
          </ScrollView>
          <PressableSurface accessibilityLabel={translate("back")} onPress={() => setPicker(null)} style={styles.closeButton}><UiText weight="800" style={styles.closeText}>{translate("back")}</UiText></PressableSurface>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  panel: { borderRadius: designTokens.radius.md, padding: 0 },
  label: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
  input: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, fontSize: designTokens.typography.body - 1 },
  picker: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, justifyContent: "center" },
  pickerText: { textAlign: "right", fontSize: designTokens.typography.body - 1 },
  suggestionButton: { alignSelf: "flex-start", minHeight: designTokens.dimensions.controlHeight.md, justifyContent: "center" },
  suggestionText: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  error: { color: theme.colors.danger, fontSize: designTokens.typography.caption, textAlign: "right" },
  success: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption + 1, textAlign: "right", fontWeight: designTokens.fontWeights.extrabold },
  note: { color: theme.colors.muted, fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "right" },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "center", padding: designTokens.spacing.lg },
  modalPanel: { maxHeight: "80%", borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  modalTitle: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
  options: { maxHeight: 440 },
  option: { minHeight: 45, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionText: { textAlign: "right", fontSize: designTokens.typography.body - 1 },
  closeButton: { minHeight: designTokens.dimensions.controlHeight.md, justifyContent: "center", alignItems: "center", borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.accent },
  closeText: { color: theme.colors.foreground, fontWeight: designTokens.fontWeights.extrabold, fontSize: designTokens.typography.caption + 1 }
}); }

