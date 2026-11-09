import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
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

type EditorState = { address: UserAddress | null } | null;
type AddressLabel = UserAddressInput["label"];

export default function AddressesScreen() {
  useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [label, setLabel] = useState<AddressLabel>("home");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addresses = useQuery({ queryKey: ["my-addresses"], queryFn: fetchMyAddresses });
  const wilayas = useQuery({ queryKey: ["checkout-wilayas"], queryFn: fetchCheckoutWilayas, staleTime: Infinity });
  const selectedWilaya = useMemo(() => wilayas.data?.find((item) => item.id === wilayaId) ?? null, [wilayas.data, wilayaId]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
    await queryClient.invalidateQueries({ queryKey: ["checkout-profile"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: UserAddressInput) => editor?.address
      ? updateMyAddress(editor.address.id, input)
      : createMyAddress(input),
    onSuccess: async () => {
      await refresh();
      setEditor(null);
      setFormError(null);
    },
    onError: () => setFormError(translate("addressesSaveError"))
  });

  const defaultMutation = useMutation({
    mutationFn: setMyDefaultAddress,
    onSuccess: refresh
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyAddress,
    onSuccess: async () => {
      await refresh();
      setDeleteTarget(null);
    }
  });

  const openEditor = (address: UserAddress | null) => {
    setLabel(address?.label ?? "home");
    setRecipientName(address?.recipient_name ?? "");
    setPhone(address?.phone ?? "");
    setWilayaId(address?.wilaya_id ?? null);
    setCommune(address?.commune ?? "");
    setAddressLine(address?.address_line ?? "");
    setAdditionalInfo(address?.additional_info ?? "");
    setFormError(null);
    setEditor({ address });
  };

  const submit = () => {
    const candidate = {
      label,
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      wilaya_id: wilayaId ?? 0,
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

  if (addresses.isPending || wilayas.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }

  if (addresses.isError || wilayas.isError) {
    return (
      <CustomerScreen>
        <AppHeader
          title={translate("addressesTitle")}
          leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />}
        />
        <ErrorState
          title={translate("addressesLoadError")}
          retryLabel={translate("retry")}
          onRetry={() => { void addresses.refetch(); void wilayas.refetch(); }}
        />
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen>
      <AppHeader
        title={translate("addressesTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />}
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
        <Card key={address.id} style={styles.addressCard} contentStyle={styles.addressCardContent}>
          <View style={styles.cardHeader}>
            <UiText weight="800">
              {translate(address.label === "home" ? "addressesHome" : address.label === "work" ? "addressesWork" : "addressesOther")}
            </UiText>
            {address.is_default ? <StatusBadge label={translate("addressesDefault")} tone="accent" /> : null}
          </View>

          <Heading level={3}>{address.recipient_name}</Heading>
          <UiText tone="muted">{address.phone}</UiText>
          <Caption>
            {String(address.wilaya_id).padStart(2, "0")} - {wilayas.data.find((item) => item.id === address.wilaya_id)?.name_ar ?? ""}، {address.commune}
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

              <FormLabel>{translate("checkoutWilaya")}</FormLabel>
              <PressableSurface
                onPress={() => setPickerOpen(true)}
                style={styles.input}
                accessibilityLabel={translate("checkoutChooseWilaya")}
              >
                <UiText>{selectedWilaya?.name_ar ?? translate("checkoutChooseWilaya")}</UiText>
              </PressableSurface>

              <Field label={translate("checkoutCommune")} value={commune} onChangeText={setCommune} styles={styles} />
              <Field label={translate("addressesStreet")} value={addressLine} onChangeText={setAddressLine} styles={styles} />
              <Field label={translate("addressesAdditional")} value={additionalInfo} onChangeText={setAdditionalInfo} styles={styles} />

              {formError ? <UiText tone="danger">{formError}</UiText> : null}

              <Button label={translate("deliveryProfileSave")} onPress={submit} loading={saveMutation.isPending} fullWidth />
              <Button label={translate("back")} onPress={() => setEditor(null)} variant="ghost" fullWidth disabled={saveMutation.isPending} />
            </ScrollView>
      </BottomSheet>

      <BottomSheet visible={pickerOpen} onRequestClose={() => setPickerOpen(false)} maxHeight="78%">
            <Heading level={3}>{translate("checkoutChooseWilaya")}</Heading>
            <ScrollView>
              {wilayas.data.map((item: Wilaya) => (
                <PressableSurface
                  key={item.id}
                  accessibilityLabel={String(item.id).padStart(2, "0") + " - " + item.name_ar}
                  onPress={() => {
                    setWilayaId(item.id);
                    setCommune("");
                    setPickerOpen(false);
                  }}
                  style={[styles.pickerOption, wilayaId === item.id && styles.pickerOptionSelected]}
                >
                  <UiText>{String(item.id).padStart(2, "0")} - {item.name_ar}</UiText>
                </PressableSurface>
              ))}
            </ScrollView>
            <Button label={translate("back")} onPress={() => setPickerOpen(false)} variant="ghost" fullWidth />
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
        textAlign="right"
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
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
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
      borderColor: theme.colors.border,
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
      backgroundColor: theme.colors.surfaceMuted
    }
  });
}
