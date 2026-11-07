import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";

import { CustomerHeading, CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchCheckoutCommunes, fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { fetchMyDeliveryProfile, saveMyDeliveryProfile } from "@/lib/delivery-profile";
import { normalizeAlgerianPhone, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import { translate } from "@/lib/i18n";

type Picker = "wilaya" | "commune" | null;

export default function DeliveryProfileScreen() {
  const dark = useColorScheme() === "dark";
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
      backgroundColor: dark ? "#171717" : "#FFFFFF",
      borderColor: dark ? "#383838" : "#E5E5E5",
      color: dark ? "#FFFFFF" : "#0A0A0A"
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
    mutation.mutate(input);
  };

  return <CustomerScreen>
    <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ {translate("back")}</Text></Pressable>
    <CustomerHeading title={translate("deliveryProfileTitle")} subtitle={translate("deliveryProfileSubtitle")} />
    <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={[styles.label, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate("fullNamePlaceholder")}</Text>
      <TextInput value={fullName} onChangeText={setFullName} maxLength={120} placeholder={translate("fullNamePlaceholder")} placeholderTextColor="#888888" style={fieldStyle} textAlign="right" />
      <Text style={[styles.label, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate("checkoutPhonePlaceholder")}</Text>
      <TextInput value={phone} onChangeText={setPhone} maxLength={20} keyboardType="phone-pad" placeholder={translate("checkoutPhonePlaceholder")} placeholderTextColor="#888888" style={fieldStyle} textAlign="right" />
      <Text style={[styles.label, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate("checkoutWilaya")}</Text>
      <Pressable onPress={() => setPicker("wilaya")} style={fieldStyle}>
        <Text style={[styles.pickerText, { color: selectedWilaya ? (dark ? "#FFFFFF" : "#0A0A0A") : "#888888" }]}>{selectedWilaya?.name_ar ?? translate("checkoutChooseWilaya")}</Text>
      </Pressable>
      <Text style={[styles.label, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate("checkoutCommune")}</Text>
      <Pressable disabled={wilayaId === null} onPress={() => setPicker("commune")} style={[fieldStyle, wilayaId === null && styles.disabled]}>
        <Text style={[styles.pickerText, { color: commune ? (dark ? "#FFFFFF" : "#0A0A0A") : "#888888" }]}>{commune || translate("checkoutChooseCommune")}</Text>
      </Pressable>
      {communes.isError ? <Text style={styles.error}>{translate("deliveryProfileCommunesError")}</Text> : null}
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Pressable disabled={mutation.isPending} onPress={submit} style={[styles.saveButton, mutation.isPending && styles.disabled]}>
        {mutation.isPending ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.saveText}>{translate("deliveryProfileSave")}</Text>}
      </Pressable>
      {mutation.isSuccess ? <Text style={styles.success}>{translate("deliveryProfileSaved")}</Text> : null}
    </View>
    <Text style={styles.note}>{translate("deliveryProfileSingleAddressNote")}</Text>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={styles.backdrop}>
        <View style={[styles.modalPanel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
          <Text style={styles.modalTitle}>{picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune")}</Text>
          {picker === "commune" && communes.isPending ? <ActivityIndicator color="#647D13" /> : null}
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
              <Text style={[styles.optionText, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{item.label}</Text>
            </Pressable>)}
          </ScrollView>
          <Pressable onPress={() => setPicker(null)} style={styles.closeButton}><Text style={styles.closeText}>{translate("back")}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

const styles = StyleSheet.create({
  back: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "900" },
  panel: { borderRadius: 18, padding: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, justifyContent: "center", fontSize: 13 },
  pickerText: { textAlign: "right", fontSize: 13 },
  saveButton: { minHeight: 49, borderRadius: 13, backgroundColor: "#C6F135", justifyContent: "center", alignItems: "center", marginTop: 5 },
  saveText: { color: "#0A0A0A", fontSize: 13, fontWeight: "900" },
  error: { color: "#B42318", fontSize: 11, textAlign: "right" },
  success: { color: "#647D13", fontSize: 12, textAlign: "right", fontWeight: "800" },
  note: { color: "#737373", fontSize: 11, lineHeight: 18, textAlign: "right" },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 18 },
  modalPanel: { maxHeight: "80%", borderRadius: 18, padding: 16, gap: 12 },
  modalTitle: { color: "#647D13", fontSize: 14, fontWeight: "900", textAlign: "right" },
  options: { maxHeight: 440 },
  option: { minHeight: 45, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  optionText: { textAlign: "right", fontSize: 13 },
  closeButton: { minHeight: 42, justifyContent: "center", alignItems: "center", borderRadius: 11, backgroundColor: "#C6F135" },
  closeText: { color: "#0A0A0A", fontWeight: "900", fontSize: 12 }
});
