import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, I18nManager, PanResponder, ScrollView, StyleSheet, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  BottomSheet,
  Card,
  Caption,
  ConfirmDialog,
  Heading,
  FormLabel,
  Icon,
  IconButton,
  PressableSurface,
  SegmentedControl,
  StatusBadge,
  Text as UiText,
  TextField
} from "@/components/ui";
import { fetchCheckoutRegions } from "@/lib/checkout";
import {  translate, useLanguage } from "@/lib/i18n";
import {
  createMyAddress,
  deleteMyAddress,
  fetchMyAddresses,
  setMyDefaultAddress,
  updateMyAddress,
  type UserAddress
} from "@/lib/user-address";
import { UserAddressSchema, type UserAddressInput } from "@/lib/user-address-state";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { getRegionDisplayName, normalizePhoneForCallingCode } from "@/lib/country-regions";
import { triggerSuccessHaptic } from "@/lib/haptics";

type EditorState = { address: UserAddress | null } | null;
type AddressLabel = UserAddressInput["label"];

export default function AddressesScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [secondaryPickerOpen, setSecondaryPickerOpen] = useState(false);
  const [label, setLabel] = useState<AddressLabel>("home");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const [secondaryRegionId, setSecondaryRegionId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addresses = useQuery({ queryKey: ["my-addresses"], queryFn: fetchMyAddresses });
  const regionOptions = useQuery({ queryKey: ["checkout-regions"], queryFn: () => fetchCheckoutRegions(), staleTime: Infinity });
  const secondaryOptions = useQuery({ queryKey: ["checkout-regions", regionId], queryFn: () => fetchCheckoutRegions(regionId), enabled: regionId !== null, staleTime: Infinity });
  const selectedRegion = useMemo(() => regionOptions.data?.regions.find((item) => item.id === regionId) ?? null, [regionOptions.data, regionId]);
  const selectedSecondaryRegion = useMemo(() => secondaryOptions.data?.regions.find((item) => item.id === secondaryRegionId) ?? null, [secondaryOptions.data, secondaryRegionId]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
    await queryClient.invalidateQueries({ queryKey: ["checkout-profile"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: UserAddressInput) => editor?.address
      ? updateMyAddress(editor.address.id, input)
      : createMyAddress(input),
    onSuccess: async () => {
      triggerSuccessHaptic();
      await refresh();
      setEditor(null);
      setFormError(null);
    },
    onError: () => setFormError(translate("addressesSaveError"))
  });

  const defaultMutation = useMutation({
    mutationFn: setMyDefaultAddress,
    onSuccess: async () => {
      triggerSuccessHaptic();
      await refresh();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyAddress,
    onSuccess: async () => {
      triggerSuccessHaptic();
      await refresh();
      setDeleteTarget(null);
    }
  });

  const openEditor = (address: UserAddress | null) => {
    setLabel(address?.label ?? "home");
    setRecipientName(address?.recipient_name ?? "");
    setPhone(address?.phone ?? "");
    setRegionId(address?.region_id ?? null);
    setSecondaryRegionId(address?.secondary_region_id ?? null);
    setCommune(address?.commune ?? "");
    setAddressLine(address?.address_line ?? "");
    setAdditionalInfo(address?.additional_info ?? "");
    setFormError(null);
    setEditor({ address });
  };

  const submit = () => {
    if (!regionOptions.data) return;
    if (regionId === null || (regionOptions.data.levels[1]?.is_required && secondaryRegionId === null)) {
      setFormError(translate("addressesValidation"));
      return;
    }
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneForCallingCode(phone, regionOptions.data.callingCode);
    } catch {
      setFormError(translate("addressesValidation"));
      return;
    }
    const candidate = {
      label,
      recipient_name: recipientName.trim(),
      phone: normalizedPhone,
      region_id: regionId ?? 0,
      secondary_region_id: secondaryRegionId,
      commune: commune.trim(),
      address_line: addressLine.trim(),
      additional_info: additionalInfo.trim()
    };
    const parsed = UserAddressSchema.safeParse(candidate);

    if (!parsed.success) {
      setFormError(translate("addressesValidation"));
      return;
    }

    setFormError(null);
    saveMutation.mutate(parsed.data);
  };

  if (addresses.isPending || regionOptions.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }

  if (addresses.isError || regionOptions.isError) {
    return (
      <CustomerScreen>
        <AppHeader
          title={translate("addressesTitle")}
          leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={20} />} />}
        />
        <ErrorState
          title={translate("addressesLoadError")}
          retryLabel={translate("retry")}
          busy={addresses.isFetching || regionOptions.isFetching}
          onRetry={() => { void addresses.refetch(); void regionOptions.refetch(); }}
        />
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen>
      <AppHeader
        title={translate("addressesTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={20} />} />}
      />

      <Caption>{translate("addressesSubtitle")}</Caption>

      {defaultMutation.isError ? (
        <UiText tone="danger">{translate("addressesDefaultError")}</UiText>
      ) : null}

      <Button
        label={translate("addressesAdd")}
        onPress={() => openEditor(null)}
        fullWidth
        startIcon={<Icon name="plus" size={18} />}
      />

      {addresses.data.length === 0 ? (
        <Card style={styles.addressCard} contentStyle={{ alignItems: "center", paddingVertical: designTokens.spacing.xxl }}>
          <Icon name="map-pin" size={30} color={theme.colors.muted} />
          <Heading level={3}>{translate("addressesEmpty")}</Heading>
          <Caption align="center">{translate("addressesEmptyHint")}</Caption>
        </Card>
      ) : addresses.data.map((address) => (
        <SwipeToDelete key={address.id} deleteLabel={translate("addressesDelete")} onDelete={() => setDeleteTarget(address)}>
        <Card style={styles.addressCard} contentStyle={styles.addressCardContent}>
          <View style={styles.cardHeader}>
            <UiText weight="800">
              {translate(address.label === "home" ? "addressesHome" : address.label === "work" ? "addressesWork" : "addressesOther")}
            </UiText>
            {address.is_default ? <StatusBadge label={translate("addressesDefault")} tone="accent" /> : null}
          </View>

          <Heading level={3}>{address.recipient_name}</Heading>
          <UiText tone="muted">{address.phone}</UiText>
          <Caption>
            {address.region ? getRegionDisplayName(address.region, language) : ""}{address.secondary_region ? "، " + getRegionDisplayName(address.secondary_region, language) : ""}، {address.commune}
          </Caption>
          <Caption>{address.address_line}</Caption>
          {address.additional_info ? <Caption>{address.additional_info}</Caption> : null}

          <View style={styles.actions}>
            {!address.is_default ? (
              <Action label={translate("addressesMakeDefault")} onPress={() => defaultMutation.mutate(address.id)} disabled={defaultMutation.isPending} />
            ) : null}
            <Action label={translate("addressesEdit")} onPress={() => openEditor(address)} />
            <Action label={translate("addressesDelete")} onPress={() => setDeleteTarget(address)} danger />
          </View>
        </Card>
        </SwipeToDelete>
      ))}

      <BottomSheet visible={editor !== null} onRequestClose={() => setEditor(null)} maxHeight="92%">
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <Heading level={3}>{translate(editor?.address ? "addressesEditTitle" : "addressesAddTitle")}</Heading>

              <FormLabel>{translate("addressesType")}</FormLabel>
              <SegmentedControl
                accessibilityLabel={translate("addressesType")}
                value={label}
                onChange={(value) => {
                  if (value === "home" || value === "work" || value === "other") setLabel(value);
                }}
                options={[
                  { key: "home", label: translate("addressesHome") },
                  { key: "work", label: translate("addressesWork") },
                  { key: "other", label: translate("addressesOther") }
                ]}
              />

              <Field label={translate("addressesRecipient")} value={recipientName} onChangeText={setRecipientName} styles={styles} />
              <Field label={translate("addressesPhone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" styles={styles} />

              <FormLabel>{regionOptions.data?.selectedLevel.label_ar ?? ""}</FormLabel>
              <PressableSurface onPress={() => setRegionPickerOpen(true)} style={styles.input} accessibilityLabel={regionOptions.data?.selectedLevel.label_ar ?? "Region"}>
                <UiText>{selectedRegion ? getRegionDisplayName(selectedRegion, language) : regionOptions.data?.selectedLevel.label_ar ?? ""}</UiText>
              </PressableSurface>

              {regionOptions.data?.levels[1] ? <>
                <FormLabel>{regionOptions.data.levels[1].label_ar}</FormLabel>
                <PressableSurface onPress={() => setSecondaryPickerOpen(true)} style={styles.input} disabled={regionId === null || secondaryOptions.isPending || secondaryOptions.isError || secondaryOptions.data?.regions.length === 0}>
                  <UiText>{selectedSecondaryRegion ? getRegionDisplayName(selectedSecondaryRegion, language) : regionOptions.data.levels[1].label_ar}</UiText>
                </PressableSurface>
                {secondaryOptions.isError ? <UiText tone="danger">{translate("checkoutDairaLoadError")}</UiText> : null}
              </> : null}
              <Field label={translate("checkoutCommune")} value={commune} onChangeText={setCommune} styles={styles} />
              <Field label={translate("addressesStreet")} value={addressLine} onChangeText={setAddressLine} styles={styles} />
              <Field label={translate("addressesAdditional")} value={additionalInfo} onChangeText={setAdditionalInfo} styles={styles} />

              {formError ? <UiText tone="danger">{formError}</UiText> : null}

              <Button label={translate("deliveryProfileSave")} onPress={submit} loading={saveMutation.isPending} fullWidth />
              <Button label={translate("back")} onPress={() => setEditor(null)} variant="ghost" fullWidth disabled={saveMutation.isPending} />
            </ScrollView>
      </BottomSheet>

      <BottomSheet visible={regionPickerOpen} onRequestClose={() => setRegionPickerOpen(false)} maxHeight="78%">
        <Heading level={3}>{regionOptions.data?.selectedLevel.label_ar ?? ""}</Heading>
        <ScrollView>
          {(regionOptions.data?.regions ?? []).map((item) => <PressableSurface key={item.id} onPress={() => {
            setRegionId(item.id);
            setSecondaryRegionId(null);
            setCommune("");
            setRegionPickerOpen(false);
          }} style={[styles.pickerOption, regionId === item.id && styles.pickerOptionSelected]}>
            <UiText>{getRegionDisplayName(item, language)}</UiText>
          </PressableSurface>)}
        </ScrollView>
        <Button label={translate("back")} onPress={() => setRegionPickerOpen(false)} variant="ghost" fullWidth />
      </BottomSheet>

      <BottomSheet visible={secondaryPickerOpen} onRequestClose={() => setSecondaryPickerOpen(false)} maxHeight="78%">
        <Heading level={3}>{secondaryOptions.data?.selectedLevel.label_ar ?? ""}</Heading>
        {secondaryOptions.isPending ? <LoadingState label={translate("stateLoading")} /> : null}
        {secondaryOptions.isError ? <UiText tone="danger">{translate("checkoutDairaLoadError")}</UiText> : null}
        <ScrollView>
          {(secondaryOptions.data?.regions ?? []).map((item) => <PressableSurface key={item.id} onPress={() => { setSecondaryRegionId(item.id); setSecondaryPickerOpen(false); }} style={styles.pickerOption}>
            <UiText>{getRegionDisplayName(item, language)}</UiText>
          </PressableSurface>)}
        </ScrollView>
        <Button label={translate("back")} onPress={() => setSecondaryPickerOpen(false)} variant="ghost" fullWidth />
      </BottomSheet>

      <ConfirmDialog
        visible={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title={translate("addressesDeleteTitle")}
        description={translate("addressesDeleteHint")}
        cancelLabel={translate("back")}
        confirmLabel={translate("addressesDelete")}
        busy={deleteMutation.isPending}
        destructive
      />
      {deleteMutation.isError ? <UiText tone="danger">{translate("addressesDeleteError")}</UiText> : null}
    </CustomerScreen>
  );
}

function SwipeToDelete({
  children,
  deleteLabel,
  onDelete
}: {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = useState(false);
  const direction = I18nManager.isRTL ? 1 : -1;
  const revealDistance = 104;

  const animateTo = useCallback((value: number) => {
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0
    }).start();
  }, [translateX]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderMove: (_, gesture) => {
      const minOffset = direction === 1 ? 0 : -revealDistance;
      const maxOffset = direction === 1 ? revealDistance : 0;
      const next = revealed
        ? Math.min(maxOffset, Math.max(minOffset, direction * revealDistance + gesture.dx))
        : direction * Math.min(revealDistance, Math.max(0, gesture.dx * direction));
      translateX.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldReveal = revealed
        ? direction * gesture.dx < -35
        : direction * gesture.dx > 55;
      setRevealed(shouldReveal);
      animateTo(shouldReveal ? direction * revealDistance : 0);
    },
    onPanResponderTerminate: () => animateTo(revealed ? direction * revealDistance : 0)
  }), [animateTo, direction, revealed, translateX]);

  return (
    <View style={{ overflow: "hidden", borderRadius: 20 }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, [I18nManager.isRTL ? "left" : "right"]: 0, width: revealDistance, alignItems: "center", justifyContent: "center" }}>
        <Button label={deleteLabel} onPress={onDelete} variant="danger" size="sm" />
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  styles,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        maxLength={240}
        style={styles.input}
        textAlign="auto"
      />
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled = false,
  danger = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return <Button label={label} onPress={onPress} disabled={disabled} variant={danger ? "danger" : "outline"} size="sm" />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    addressCard: {
      backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface,
      borderColor: theme.mode === "light" ? "transparent" : theme.colors.border,
      borderRadius: theme.radius.xl
    },
    addressCardContent: {
      gap: designTokens.spacing.md,
      padding: designTokens.spacing.lg
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: designTokens.spacing.sm
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: designTokens.spacing.sm,
      marginTop: designTokens.spacing.xs,
      paddingTop: designTokens.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border
    },
    formContent: { gap: designTokens.spacing.md, paddingBottom: designTokens.spacing.lg },
    field: { gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs },
    input: {
      minHeight: designTokens.dimensions.controlHeight.lg,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: designTokens.spacing.md,
      justifyContent: "center",
      color: theme.colors.foreground,
      backgroundColor: theme.colors.background,
      fontSize: designTokens.typography.body - 1
    },
    pickerOption: {
      minHeight: 54,
      paddingHorizontal: designTokens.spacing.md,
      justifyContent: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border
    },
    pickerOptionSelected: {
      backgroundColor: theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceMuted
    }
  });
}
