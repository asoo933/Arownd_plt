import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CustomerHeading, CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { translate } from "@/lib/i18n";
import {
  createMyAddress,
  deleteMyAddress,
  fetchMyAddresses,
  setMyDefaultAddress,
  updateMyAddress,
  type UserAddress
} from "@/lib/user-address";
import { UserAddressSchema, type UserAddressInput } from "@/lib/user-address-state";
import { useAppTheme, type AppTheme } from "@/lib/theme";

type EditorState = { address: UserAddress | null } | null;
type AddressLabel = UserAddressInput["label"];

export default function AddressesScreen() {
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
    onSuccess: async () => { await refresh(); setDeleteTarget(null); }
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
    return <CustomerScreen>
      <CustomerHeading title={translate("addressesTitle")} />
      <ErrorState title={translate("addressesLoadError")} retryLabel={translate("retry")} onRetry={() => { void addresses.refetch(); void wilayas.refetch(); }} />
    </CustomerScreen>;
  }

  return <CustomerScreen>
    <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ {translate("back")}</Text></Pressable>
    <CustomerHeading title={translate("addressesTitle")} subtitle={translate("addressesSubtitle")} />
    {defaultMutation.isError ? <Text style={styles.error}>{translate("addressesDefaultError")}</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => openEditor(null)} style={styles.addButton}>
      <Text style={styles.addText}>＋ {translate("addressesAdd")}</Text>
    </Pressable>
    {addresses.data.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{translate("addressesEmpty")}</Text>
        <Text style={styles.emptyHint}>{translate("addressesEmptyHint")}</Text>
      </View>
    ) : addresses.data.map((address) => (
      <View key={address.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.addressLabel}>{translate(address.label === "home" ? "addressesHome" : address.label === "work" ? "addressesWork" : "addressesOther")}</Text>
          {address.is_default ? <Text style={styles.defaultBadge}>{translate("addressesDefault")}</Text> : null}
        </View>
        <Text style={styles.recipient}>{address.recipient_name}</Text>
        <Text style={styles.detail}>{address.phone}</Text>
        <Text style={styles.detail}>{String(address.wilaya_id).padStart(2, "0")} - {wilayas.data.find((item) => item.id === address.wilaya_id)?.name_ar ?? ""}، {address.commune}</Text>
        <Text style={styles.detail}>{address.address_line}</Text>
        {address.additional_info ? <Text style={styles.detail}>{address.additional_info}</Text> : null}
        <View style={styles.actions}>
          {!address.is_default ? <Action label={translate("addressesMakeDefault")} onPress={() => defaultMutation.mutate(address.id)} disabled={defaultMutation.isPending} /> : null}
          <Action label={translate("addressesEdit")} onPress={() => openEditor(address)} />
          <Action label={translate("addressesDelete")} onPress={() => setDeleteTarget(address)} danger />
        </View>
      </View>
    ))}

    <Modal visible={editor !== null} transparent animationType="slide" onRequestClose={() => setEditor(null)}>
      <View style={styles.backdrop}>
        <View style={styles.modalPanel}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{translate(editor?.address ? "addressesEditTitle" : "addressesAddTitle")}</Text>
            <Text style={styles.label}>{translate("addressesType")}</Text>
            <View style={styles.chips}>
              {(["home", "work", "other"] as const).map((item) => <Pressable key={item} onPress={() => setLabel(item)} style={[styles.chip, label === item && styles.chipActive]}>
                <Text style={[styles.chipText, label === item && styles.chipTextActive]}>{translate(item === "home" ? "addressesHome" : item === "work" ? "addressesWork" : "addressesOther")}</Text>
              </Pressable>)}
            </View>
            <Field label={translate("addressesRecipient")} value={recipientName} onChangeText={setRecipientName} styles={styles} theme={theme} />
            <Field label={translate("addressesPhone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" styles={styles} theme={theme} />
            <Text style={styles.label}>{translate("checkoutWilaya")}</Text>
            <Pressable onPress={() => setPickerOpen(true)} style={styles.input}><Text style={styles.inputText}>{selectedWilaya?.name_ar ?? translate("checkoutChooseWilaya")}</Text></Pressable>
            <Field label={translate("checkoutCommune")} value={commune} onChangeText={setCommune} styles={styles} theme={theme} />
            <Field label={translate("addressesStreet")} value={addressLine} onChangeText={setAddressLine} styles={styles} theme={theme} />
            <Field label={translate("addressesAdditional")} value={additionalInfo} onChangeText={setAdditionalInfo} styles={styles} theme={theme} />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Pressable disabled={saveMutation.isPending} onPress={submit} style={[styles.saveButton, saveMutation.isPending && styles.disabled]}>
              {saveMutation.isPending ? <ActivityIndicator color={theme.colors.foreground} /> : <Text style={styles.saveText}>{translate("deliveryProfileSave")}</Text>}
            </Pressable>
            <Pressable onPress={() => setEditor(null)} style={styles.cancelButton}><Text style={styles.cancelText}>{translate("back")}</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <View style={styles.backdrop}><View style={styles.pickerPanel}>
        <Text style={styles.modalTitle}>{translate("checkoutChooseWilaya")}</Text>
        <ScrollView>{wilayas.data.map((item: Wilaya) => <Pressable key={item.id} onPress={() => { setWilayaId(item.id); setCommune(""); setPickerOpen(false); }} style={styles.pickerOption}>
          <Text style={styles.inputText}>{String(item.id).padStart(2, "0")} - {item.name_ar}</Text>
        </Pressable>)}</ScrollView>
        <Pressable onPress={() => setPickerOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>{translate("back")}</Text></Pressable>
      </View></View>
    </Modal>

    <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
      <View style={styles.backdrop}><View style={styles.confirmPanel}>
        <Text style={styles.modalTitle}>{translate("addressesDeleteTitle")}</Text>
        <Text style={styles.detail}>{translate("addressesDeleteHint")}</Text>
        <Pressable disabled={deleteMutation.isPending} onPress={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }} style={styles.deleteConfirm}>
          {deleteMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteConfirmText}>{translate("addressesDelete")}</Text>}
        </Pressable>
        <Pressable onPress={() => setDeleteTarget(null)} style={styles.cancelButton}><Text style={styles.cancelText}>{translate("back")}</Text></Pressable>
        {deleteMutation.isError ? <Text style={styles.error}>{translate("addressesDeleteError")}</Text> : null}
      </View></View>
    </Modal>
  </CustomerScreen>;
}

function Field({ label, value, onChangeText, styles, theme, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
  keyboardType?: "default" | "phone-pad";
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType ?? "default"} maxLength={240} placeholderTextColor={theme.colors.placeholder} style={styles.input} textAlign="right" />
  </View>;
}

function Action({ label, onPress, disabled = false, danger = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[stylesAction.button, danger && stylesAction.danger, disabled && stylesAction.disabled]}>
    <Text style={[stylesAction.text, danger && stylesAction.dangerText]}>{label}</Text>
  </Pressable>;
}

const stylesAction = StyleSheet.create({
  button: { minHeight: 38, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#EFEFEF", justifyContent: "center", alignItems: "center" },
  danger: { backgroundColor: "#FCE8E8" },
  text: { color: "#202020", fontSize: 11, fontWeight: "800" },
  dangerText: { color: "#B42318" },
  disabled: { opacity: 0.5 }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    back: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
    backText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
    addButton: { minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
    addText: { color: theme.colors.foreground, fontWeight: "900", fontSize: 13 },
    empty: { padding: 24, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: "center", gap: 8 },
    emptyTitle: { color: theme.colors.foreground, fontWeight: "900", fontSize: 15 },
    emptyHint: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
    card: { padding: 15, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 7 },
    cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
    addressLabel: { color: theme.colors.foreground, fontSize: 14, fontWeight: "900" },
    defaultBadge: { color: theme.colors.foreground, backgroundColor: theme.colors.accent, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, fontWeight: "900" },
    recipient: { color: theme.colors.foreground, fontWeight: "800", textAlign: "right" },
    detail: { color: theme.colors.muted, fontSize: 12, textAlign: "right", lineHeight: 19 },
    actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 7 },
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "center", padding: 15 },
    modalPanel: { maxHeight: "92%", backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16 },
    pickerPanel: { maxHeight: "78%", backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, gap: 10 },
    confirmPanel: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 18, gap: 12 },
    modalTitle: { color: theme.colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "right", marginBottom: 14 },
    field: { gap: 6, marginBottom: 11 },
    label: { color: theme.colors.foreground, fontSize: 12, fontWeight: "800", textAlign: "right", marginBottom: 6 },
    chips: { flexDirection: "row-reverse", gap: 7, marginBottom: 12 },
    chip: { paddingHorizontal: 12, minHeight: 36, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
    chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    chipText: { color: theme.colors.foreground, fontSize: 11, fontWeight: "700" },
    chipTextActive: { color: theme.colors.foreground, fontWeight: "900" },
    input: { minHeight: 47, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, paddingHorizontal: 12, justifyContent: "center", color: theme.colors.foreground, backgroundColor: theme.colors.background, fontSize: 13 },
    inputText: { color: theme.colors.foreground, fontSize: 13, textAlign: "right" },
    pickerOption: { minHeight: 44, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    error: { color: theme.colors.danger, fontSize: 11, textAlign: "right", marginVertical: 7 },
    saveButton: { minHeight: 48, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center", marginTop: 8 },
    saveText: { color: theme.colors.foreground, fontWeight: "900" },
    cancelButton: { minHeight: 43, alignItems: "center", justifyContent: "center", marginTop: 5 },
    cancelText: { color: theme.colors.muted, fontWeight: "800" },
    deleteConfirm: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.danger, alignItems: "center", justifyContent: "center" },
    deleteConfirmText: { color: "#FFFFFF", fontWeight: "900" },
    disabled: { opacity: 0.5 }
  });
}
