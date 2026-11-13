import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, Caption, FormLabel, Icon, IconButton, PressableSurface, Spinner, Text as UiText, TextField } from "@/components/ui";
import { fetchCheckoutCommunes, fetchCheckoutRegions } from "@/lib/checkout";
import { fetchMyDeliveryProfile, saveMyDeliveryProfile } from "@/lib/delivery-profile";
import { DeliveryProfileSchema, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import {  translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { getRegionDisplayName, getRegionLevelDisplayName, normalizePhoneForCallingCode } from "@/lib/country-regions";

type Picker = "region" | "secondary" | "commune" | null;
type DeliveryProfileField = "full_name" | "phone" | "region_id" | "secondary_region_id" | "commune";
const deliveryProfileFieldOrder: DeliveryProfileField[] = ["full_name", "phone", "region_id", "secondary_region_id", "commune"];

export default function DeliveryProfileScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const [secondaryRegionId, setSecondaryRegionId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DeliveryProfileField, string>>>({});
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const fieldRefs = useRef<Partial<Record<DeliveryProfileField, ComponentRef<typeof View> | null>>>({});
  const [initialized, setInitialized] = useState(false);

  const profile = useQuery({
    queryKey: ["my-delivery-profile"],
    queryFn: fetchMyDeliveryProfile
  });
  const regionOptions = useQuery({ queryKey: ["checkout-regions"], queryFn: () => fetchCheckoutRegions(), staleTime: Infinity });
  const secondaryOptions = useQuery({ queryKey: ["checkout-regions", regionId], queryFn: () => fetchCheckoutRegions(regionId), enabled: regionId !== null, staleTime: Infinity });
  const communes = useQuery({
    queryKey: ["checkout-communes", regionId],
    queryFn: () => fetchCheckoutCommunes(regionId as number),
    enabled: regionId !== null,
    staleTime: 5 * 60 * 1000
  });
  const selectedRegion = useMemo(() => regionOptions.data?.regions.find((item) => item.id === regionId) ?? null, [regionOptions.data, regionId]);
  const selectedSecondaryRegion = useMemo(() => secondaryOptions.data?.regions.find((item) => item.id === secondaryRegionId) ?? null, [secondaryOptions.data, secondaryRegionId]);
  const hasChanges = initialized && (
    fullName !== (profile.data?.full_name ?? "") ||
    phone !== (profile.data?.phone ?? "") ||
    regionId !== (profile.data?.region_id ?? null) ||
    secondaryRegionId !== (profile.data?.secondary_region_id ?? null) ||
    commune !== (profile.data?.commune ?? "")
  );
  const firstErrorField = deliveryProfileFieldOrder.find((field) => Boolean(fieldErrors[field])) ?? null;
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
    if (!firstErrorField) return;
    const frame = requestAnimationFrame(() => {
      const field = fieldRefs.current[firstErrorField];
      const scroll = scrollRef.current;
      if (!field || !scroll) return;
      field.measureLayout(
        scroll,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - designTokens.spacing.lg), animated: true }),
        () => undefined
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [firstErrorField]);

  useEffect(() => {
    if (!mutation.isSuccess) return;
    const timeout = setTimeout(() => mutation.reset(), 3000);
    return () => clearTimeout(timeout);
  }, [mutation.isSuccess, mutation.reset]);

  useEffect(() => {
    if (!profile.isSuccess || initialized) return;
    setFullName(profile.data?.full_name ?? "");
    setPhone(profile.data?.phone ?? "");
    setRegionId(profile.data?.region_id ?? null);
    setSecondaryRegionId(profile.data?.secondary_region_id ?? null);
    setCommune(profile.data?.commune ?? "");
    setInitialized(true);
  }, [profile.data, profile.isSuccess, initialized]);

  if (profile.isPending || regionOptions.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (profile.isError || regionOptions.isError) {
    return <CustomerScreen>
      <AppHeader title={translate("deliveryProfileTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={20} />} />} />
      <ErrorState title={translate("deliveryProfileLoadError")} retryLabel={translate("retry")} busy={profile.isFetching || regionOptions.isFetching} onRetry={() => { void profile.refetch(); void regionOptions.refetch(); }} />
    </CustomerScreen>;
  }

  const fieldStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      color: theme.colors.foreground
    }
  ];
  const pickerStyle = [
    styles.picker,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.inputBorder
    }
  ];
  const pickerItems = picker === "region"
    ? (regionOptions.data?.regions ?? []).map((item) => ({ id: String(item.id), label: getRegionDisplayName(item, language) }))
    : picker === "secondary"
      ? (secondaryOptions.data?.regions ?? []).map((item) => ({ id: String(item.id), label: getRegionDisplayName(item, language) }))
      : (communes.data ?? []).map((item) => ({ id: item, label: item }));

  const clearSaveFeedback = (field?: DeliveryProfileField) => {
    setFormError(null);
    mutation.reset();
    if (field) setFieldErrors((current) => { const next = { ...current }; delete next[field]; return next; });
    else setFieldErrors({});
  };

  const submit = () => {
    setFormError(null);
    const nextErrors: Partial<Record<DeliveryProfileField, string>> = {};
    if (fullName.trim().length < 2 || fullName.trim().length > 120) {
      nextErrors.full_name = translate("deliveryProfileNameError");
    }

    let normalizedPhone = "";
    try {
      normalizedPhone = normalizePhoneForCallingCode(phone, regionOptions.data?.callingCode ?? "");
    } catch {
      nextErrors.phone = translate("deliveryProfilePhoneError");
    }

    if (regionId === null) nextErrors.region_id = translate("deliveryProfileRegionError");
    if (regionOptions.data?.levels[1]?.is_required && secondaryRegionId === null) {
      nextErrors.secondary_region_id = translate("deliveryProfileSecondaryRegionError");
    }
    if (commune.trim().length < 2 || commune.trim().length > 100) {
      nextErrors.commune = translate("deliveryProfileCommuneError");
    }

    const input: DeliveryProfileInput = {
      full_name: fullName.trim(),
      phone: normalizedPhone,
      region_id: regionId ?? 0,
      secondary_region_id: secondaryRegionId,
      commune: commune.trim()
    };
    const parsed = DeliveryProfileSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "full_name" && !nextErrors.full_name) nextErrors.full_name = translate("deliveryProfileNameError");
        if (field === "phone" && !nextErrors.phone) nextErrors.phone = translate("deliveryProfilePhoneError");
        if (field === "region_id" && !nextErrors.region_id) nextErrors.region_id = translate("deliveryProfileRegionError");
        if (field === "secondary_region_id" && regionOptions.data?.levels[1]?.is_required && !nextErrors.secondary_region_id) nextErrors.secondary_region_id = translate("deliveryProfileSecondaryRegionError");
        if (field === "commune" && !nextErrors.commune) nextErrors.commune = translate("deliveryProfileCommuneError");
      }
    }

    if (Object.keys(nextErrors).length > 0 || !parsed.success) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    mutation.mutate(parsed.data);
  };

  return <CustomerScreen scrollRef={scrollRef} footer={<View style={styles.stickyFooter}>
    {mutation.isSuccess ? <View accessibilityRole="alert" style={styles.snackbar}><Icon name="circle-check" size={18} color={theme.colors.success} /><UiText tone="success" weight="700">{translate("deliveryProfileSaved")}</UiText></View> : null}
    <Button label={translate("deliveryProfileSave")} onPress={submit} loading={mutation.isPending} disabled={!hasChanges || mutation.isPending} fullWidth />
  </View>}>
    <AppHeader title={translate("deliveryProfileTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={20} />} />} />
    <Caption>{translate("deliveryProfileSubtitle")}</Caption>
    <Card style={styles.panel} contentStyle={{ gap: designTokens.spacing.md, padding: designTokens.spacing.lg }}>
      <View ref={(node) => { fieldRefs.current.full_name = node; }}>
        <FormLabel>{translate("fullNamePlaceholder")}</FormLabel>
        <TextField accessibilityLabel={translate("fullNamePlaceholder")} value={fullName} onChangeText={(value) => { setFullName(value); clearSaveFeedback("full_name"); }} maxLength={120} placeholder={translate("fullNamePlaceholder")} style={fieldStyle} textAlign="right" error={fieldErrors.full_name} />
      </View>
      <View ref={(node) => { fieldRefs.current.phone = node; }}>
        <FormLabel>{translate("checkoutPhonePlaceholder")}</FormLabel>
        <TextField accessibilityLabel={translate("checkoutPhonePlaceholder")} value={phone} onChangeText={(value) => { setPhone(value); clearSaveFeedback("phone"); }} maxLength={20} keyboardType="phone-pad" placeholder={translate("checkoutPhonePlaceholder")} style={fieldStyle} textAlign="left" error={fieldErrors.phone} />
      </View>
      <View ref={(node) => { fieldRefs.current.region_id = node; }}>
      <FormLabel>{regionOptions.data ? getRegionLevelDisplayName(regionOptions.data.selectedLevel, language) : ""}</FormLabel>
      <PressableSurface accessibilityLabel={regionOptions.data ? getRegionLevelDisplayName(regionOptions.data.selectedLevel, language) : "Region"} onPress={() => setPicker("region")} style={[pickerStyle, styles.pickerRow]}>
        <UiText tone={selectedRegion ? "foreground" : "muted"}>{selectedRegion ? getRegionDisplayName(selectedRegion, language) : regionOptions.data ? getRegionLevelDisplayName(regionOptions.data.selectedLevel, language) : ""}</UiText>
        <Icon name="chevron-down" size={18} color={theme.colors.muted} accessibilityHidden />
      </PressableSurface>
      {fieldErrors.region_id ? <UiText tone="danger" accessibilityRole="alert">{fieldErrors.region_id}</UiText> : null}
      </View>
      {regionOptions.data?.levels[1] ? <View ref={(node) => { fieldRefs.current.secondary_region_id = node; }}>
        <FormLabel>{getRegionLevelDisplayName(regionOptions.data.levels[1], language)}</FormLabel>
        <PressableSurface accessibilityLabel={getRegionLevelDisplayName(regionOptions.data.levels[1], language)} onPress={() => setPicker("secondary")} style={[pickerStyle, styles.pickerRow, (regionId === null || secondaryOptions.isPending || secondaryOptions.isError || secondaryOptions.data?.regions.length === 0) && styles.disabled]} disabled={regionId === null || secondaryOptions.isPending || secondaryOptions.isError || secondaryOptions.data?.regions.length === 0}>
          <UiText tone={selectedSecondaryRegion ? "foreground" : "muted"}>{selectedSecondaryRegion ? getRegionDisplayName(selectedSecondaryRegion, language) : getRegionLevelDisplayName(regionOptions.data.levels[1], language)}</UiText>
          <Icon name="chevron-down" size={18} color={theme.colors.muted} accessibilityHidden />
        </PressableSurface>
        {fieldErrors.secondary_region_id ? <UiText tone="danger" accessibilityRole="alert">{fieldErrors.secondary_region_id}</UiText> : null}
        {secondaryOptions.isError ? <UiText tone="danger">{translate("checkoutDairaLoadError")}</UiText> : null}
      </View> : null}
      <View ref={(node) => { fieldRefs.current.commune = node; }}>
      <FormLabel>{translate("checkoutCommune")}</FormLabel>
      {(communes.data?.length ?? 0) > 0 ? (
        <PressableSurface accessibilityLabel={translate("checkoutCommune")} onPress={() => setPicker("commune")} style={[pickerStyle, styles.pickerRow, !regionId && styles.disabled]} disabled={!regionId}>
          <UiText tone={commune ? "foreground" : "muted"}>{commune || translate("checkoutChooseCommune")}</UiText>
          <Icon name="chevron-down" size={18} color={theme.colors.muted} accessibilityHidden />
        </PressableSurface>
      ) : (
        <TextField
          accessibilityLabel={translate("checkoutCommune")}
          value={commune}
          onChangeText={(value) => { setCommune(value); clearSaveFeedback("commune"); }}
          editable={regionId !== null}
          maxLength={100}
          placeholder={translate("checkoutCommunePlaceholder")}
          style={[...fieldStyle, regionId === null && styles.disabled]}
          textAlign="right"
          error={fieldErrors.commune}
        />
      )}
      {(communes.data?.length ?? 0) > 0 && fieldErrors.commune ? <UiText tone="danger" accessibilityRole="alert">{fieldErrors.commune}</UiText> : null}
      {communes.isError ? <UiText tone="danger">{translate("deliveryProfileCommunesError")}</UiText> : null}
      </View>
      {formError ? <UiText tone="danger">{formError}</UiText> : null}
    </Card>
    <Caption>{translate("deliveryProfileDefaultAreaNote")}</Caption>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <UiText weight="800" style={styles.modalTitle}>{picker === "region" ? (regionOptions.data ? getRegionLevelDisplayName(regionOptions.data.selectedLevel, language) : "") : picker === "secondary" ? (secondaryOptions.data ? getRegionLevelDisplayName(secondaryOptions.data.selectedLevel, language) : "") : translate("checkoutChooseCommune")}</UiText>
          {picker === "commune" && communes.isPending ? <Spinner size="small" /> : null}
          {picker === "secondary" && secondaryOptions.isPending ? <Spinner size="small" /> : null}
          {picker === "commune" && communes.isError ? <UiText tone="danger">{translate("deliveryProfileCommunesError")}</UiText> : null}
          <ScrollView style={styles.options}>
            {pickerItems.map((item) => <PressableSurface key={item.id} accessibilityLabel={item.label} onPress={() => {
              if (picker === "region") {
                setRegionId(Number(item.id));
                setSecondaryRegionId(null);
                setCommune("");
                clearSaveFeedback("region_id");
                setFieldErrors((current) => { const next = { ...current }; delete next.secondary_region_id; delete next.commune; return next; });
              } else if (picker === "secondary") {
                setSecondaryRegionId(Number(item.id));
                clearSaveFeedback("secondary_region_id");
              } else if (picker === "commune") {
                setCommune(item.label);
                clearSaveFeedback("commune");
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
  stickyFooter: { gap: designTokens.spacing.sm },
  snackbar: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSecondary },
  panel: {
    backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface,
    borderColor: theme.mode === "light" ? "transparent" : theme.colors.border,
    borderRadius: theme.radius.xl,
    padding: 0
  },
  label: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  input: {
    minHeight: designTokens.dimensions.controlHeight.lg,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    fontSize: designTokens.typography.body - 1
  },
  picker: {
    minHeight: designTokens.dimensions.controlHeight.lg,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    justifyContent: "center"
  },
  pickerText: { textAlign: "auto", fontSize: designTokens.typography.body - 1 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  suggestionButton: {
    alignSelf: "flex-start",
    minHeight: designTokens.dimensions.controlHeight.md,
    paddingHorizontal: designTokens.spacing.sm,
    justifyContent: "center"
  },
  suggestionText: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  error: { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger, fontSize: designTokens.typography.caption, textAlign: "auto" },
  success: { color: theme.mode === "light" ? theme.colors.successText : theme.colors.success, fontSize: designTokens.typography.caption + 1, textAlign: "auto", fontWeight: designTokens.fontWeights.extrabold },
  note: { color: theme.colors.muted, fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "center", padding: designTokens.spacing.lg },
  modalPanel: {
    maxHeight: "80%",
    borderRadius: theme.radius.xl,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md
  },
  modalTitle: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  options: { maxHeight: 440 },
  option: {
    minHeight: 52,
    paddingHorizontal: designTokens.spacing.sm,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  optionText: { textAlign: "auto", fontSize: designTokens.typography.body - 1 },
  closeButton: {
    minHeight: designTokens.dimensions.controlHeight.md,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent
  },
  closeText: { color: theme.colors.accentForeground, fontWeight: designTokens.fontWeights.extrabold, fontSize: designTokens.typography.caption + 1 }
}); }

