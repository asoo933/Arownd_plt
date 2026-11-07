import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchOffersByIds, formatDZD } from "@/lib/catalog";
import {
  completeCheckout,
  fetchCheckoutCommunes,
  fetchCheckoutProfile,
  fetchCheckoutWilayas,
  submitCheckout,
  type CheckoutDeliveryType,
  type CheckoutInput,
  type Wilaya
} from "@/lib/checkout";
import { CART_QUERY_KEY, clearCart, getCart } from "@/lib/cart";
import { evaluateCart } from "@/lib/cart-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";

type Picker = "wilaya" | "commune" | null;

function validAlgerianPhone(value: string): boolean {
  const normalized = value.replace(/[\\s()-]/g, "");
  return /^(?:0[567]\\d{8}|\\+213[567]\\d{8}|00213[567]\\d{8})$/.test(normalized);
}

export default function CheckoutScreen() {
  const dark = useColorScheme() === "dark";
  const queryClient = useQueryClient();
  const [deliveryType, setDeliveryType] = useState<CheckoutDeliveryType>("home");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [commune, setCommune] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [profileApplied, setProfileApplied] = useState(false);

  const auth = useQuery({
    queryKey: ["checkout-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    }
  });
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const offerIds = cart.data?.map((item) => item.offerId) ?? [];
  const offers = useQuery({
    queryKey: ["customer-cart-offers", offerIds],
    queryFn: () => fetchOffersByIds(offerIds),
    enabled: cart.isSuccess && offerIds.length > 0
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
  const profile = useQuery({
    queryKey: ["checkout-profile"],
    queryFn: fetchCheckoutProfile,
    enabled: auth.data !== undefined && auth.data !== null
  });

  useEffect(() => {
    if (!profile.data || profileApplied) return;
    setFullName(profile.data.full_name ?? auth.data?.user_metadata?.["full_name"] ?? "");
    setPhone(profile.data.phone ?? auth.data?.phone ?? "");
    setWilayaId(profile.data.wilaya_id ?? null);
    setCommune(profile.data.commune ?? "");
    setProfileApplied(true);
  }, [profile.data, profileApplied, auth.data]);

  const selectedWilaya = useMemo(
    () => wilayas.data?.find((item) => item.id === wilayaId) ?? null,
    [wilayas.data, wilayaId]
  );
  const evaluation = evaluateCart(cart.data ?? [], offers.data);
  const offerById = new Map((offers.data ?? []).map((offer) => [offer.id, offer]));
  const hasBlockingItems = evaluation.blockingCount > 0;
  const mutation = useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const orderId = await submitCheckout(input);
      return { orderId, input };
    },
    onSuccess: async ({ orderId, input }) => {
      setCreatedOrderId(orderId);
      setFormError(null);
      try {
        const nextCart = await clearCart();
        queryClient.setQueryData(CART_QUERY_KEY, nextCart);
        await completeCheckout(input);
      } catch {
        // The server has confirmed the order. Keep the success state and
        // retain the idempotency key if local cleanup could not complete.
        queryClient.setQueryData(CART_QUERY_KEY, []);
      }
      void queryClient.invalidateQueries({ queryKey: ["customer-cart-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    },
    onError: () => setFormError(translate("checkoutSubmitError"))
  });

  if (createdOrderId) {
    return <CustomerScreen>
      <View style={[styles.successPanel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <Text style={styles.successMark}>✓</Text>
        <CustomerHeading title={translate("checkoutSuccessTitle")} subtitle={translate("checkoutSuccessMessage")} />
        <Text style={styles.orderLabel}>{translate("checkoutOrderNumber")}</Text>
        <Text selectable style={[styles.orderId, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{createdOrderId}</Text>
        <Text style={styles.hint}>{translate("checkoutDeliveryAfterNote")}</Text>
        <Pressable onPress={() => router.replace("/home")} style={styles.primary}>
          <Text style={styles.primaryText}>{translate("checkoutBackHome")}</Text>
        </Pressable>
      </View>
    </CustomerScreen>;
  }

  if (cart.isPending || auth.isPending) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (cart.isError || auth.isError) return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => { void cart.refetch(); void auth.refetch(); }} /></CustomerScreen>;
  if (!cart.data.length) return <CustomerScreen>
    <CustomerHeading title={translate("checkoutTitle")} />
    <EmptyState title={translate("cartEmpty")} hint={translate("cartEmptyHint")} />
    <Pressable onPress={() => router.replace("/explore")} style={styles.primary}><Text style={styles.primaryText}>{translate("cartBrowse")}</Text></Pressable>
  </CustomerScreen>;

  const submit = () => {
    setFormError(null);
    if (!offers.data || offers.isPending || offers.isError) {
      setFormError(translate("checkoutOffersNotReady"));
      return;
    }
    if (hasBlockingItems) {
      setFormError(translate("checkoutFixCart"));
      return;
    }
    if (fullName.trim().length < 2 || fullName.trim().length > 120) {
      setFormError(translate("checkoutNameInvalid"));
      return;
    }
    if (!validAlgerianPhone(phone)) {
      setFormError(translate("checkoutPhoneInvalid"));
      return;
    }
    if (wilayaId === null || !commune.trim()) {
      setFormError(translate("checkoutAreaRequired"));
      return;
    }
    if (deliveryType === "home" && !addressLine.trim()) {
      setFormError(translate("checkoutAddressRequired"));
      return;
    }
    const input: CheckoutInput = {
      userId: auth.data?.id ?? "",
      items: cart.data,
      deliveryType,
      wilayaId,
      commune: commune.trim(),
      addressLine: deliveryType === "home" ? addressLine.trim() : "",
      fullName: fullName.trim(),
      phone: phone.trim()
    };
    mutation.mutate(input);
  };

  const fieldStyle = [styles.input, { backgroundColor: dark ? "#171717" : "#FFFFFF", borderColor: dark ? "#383838" : "#E5E5E5", color: dark ? "#FFFFFF" : "#0A0A0A" }];
  const modalTitle = picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune");
  const pickerItems: { id: string; label: string; wilaya?: Wilaya }[] = picker === "wilaya"
    ? (wilayas.data ?? []).map((item) => ({ id: String(item.id), label: String(item.id).padStart(2, "0") + " - " + item.name_ar, wilaya: item }))
    : (communes.data ?? []).map((item) => ({ id: item, label: item }));

  return <CustomerScreen>
    <View style={styles.topRow}>
      <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>{translate("back")}</Text></Pressable>
      <CustomerHeading title={translate("checkoutTitle")} subtitle={translate("checkoutSubtitle")} />
    </View>

    <View style={[styles.section, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutContactTitle")}</Text>
      <TextInput value={fullName} onChangeText={setFullName} placeholder={translate("fullNamePlaceholder")} placeholderTextColor="#888888" style={fieldStyle} textAlign="right" maxLength={120} />
      <TextInput value={phone} onChangeText={setPhone} placeholder={translate("checkoutPhonePlaceholder")} placeholderTextColor="#888888" style={fieldStyle} textAlign="right" keyboardType="phone-pad" maxLength={20} />
    </View>

    <View style={[styles.section, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutDeliveryTitle")}</Text>
      <View style={styles.deliveryOptions}>
        <Pressable onPress={() => setDeliveryType("home")} style={[styles.deliveryOption, deliveryType === "home" && styles.deliverySelected]}>
          <Text style={[styles.deliveryTitle, deliveryType === "home" && styles.deliveryTextSelected]}>{translate("checkoutHomeDelivery")}</Text>
          <Text style={styles.deliveryHint}>{translate("checkoutHomeDeliveryHint")}</Text>
        </Pressable>
        <Pressable onPress={() => setDeliveryType("desk")} style={[styles.deliveryOption, deliveryType === "desk" && styles.deliverySelected]}>
          <Text style={[styles.deliveryTitle, deliveryType === "desk" && styles.deliveryTextSelected]}>{translate("checkoutStorePickup")}</Text>
          <Text style={styles.deliveryHint}>{translate("checkoutStorePickupHint")}</Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>{translate("checkoutWilaya")}</Text>
      <Pressable onPress={() => setPicker("wilaya")} disabled={wilayas.isPending || wilayas.isError} style={[styles.select, { backgroundColor: dark ? "#0A0A0A" : "#F5F5F5" }]}>
        <Text style={[styles.selectText, !selectedWilaya && styles.placeholder]}>{selectedWilaya ? String(selectedWilaya.id).padStart(2, "0") + " - " + selectedWilaya.name_ar : wilayas.isError ? translate("checkoutWilayaError") : translate("checkoutChooseWilaya")}</Text>
        {wilayas.isPending ? <ActivityIndicator size="small" /> : null}
      </Pressable>
      {wilayas.isError ? <Pressable onPress={() => void wilayas.refetch()}><Text style={styles.retryText}>{translate("retry")}</Text></Pressable> : null}

      <Text style={styles.fieldLabel}>{translate("checkoutCommune")}</Text>
      {communes.data && communes.data.length > 0 ? (
        <Pressable onPress={() => setPicker("commune")} style={[styles.select, { backgroundColor: dark ? "#0A0A0A" : "#F5F5F5" }]} disabled={!wilayaId}>
          <Text style={[styles.selectText, !commune && styles.placeholder]}>{commune || translate("checkoutChooseCommune")}</Text>
        </Pressable>
      ) : (
        <TextInput value={commune} onChangeText={setCommune} placeholder={translate("checkoutCommunePlaceholder")} placeholderTextColor="#888888" style={fieldStyle} textAlign="right" editable={wilayaId !== null && !communes.isPending} />
      )}
      {communes.isError ? <Text style={styles.fieldHint}>{translate("checkoutCommunesFallback")}</Text> : null}

      {deliveryType === "home" ? <>
        <Text style={styles.fieldLabel}>{translate("checkoutAddress")}</Text>
        <TextInput value={addressLine} onChangeText={setAddressLine} placeholder={translate("checkoutAddressPlaceholder")} placeholderTextColor="#888888" style={[...fieldStyle, styles.multiline]} textAlign="right" multiline maxLength={300} />
      </> : <Text style={styles.fieldHint}>{translate("checkoutPickupNote")}</Text>}
    </View>

    <View style={[styles.section, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutSummary")}</Text>
      {cart.data.map((item) => {
        const offer = offerById.get(item.offerId);
        return <View key={item.offerId + JSON.stringify(item.options)} style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryName, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{offer?.product.name ?? item.name ?? translate("cartUnknownStore")}</Text>
            <Text style={styles.fieldHint}>{translate("checkoutQuantity")}: {item.quantity}</Text>
          </View>
          <Text style={styles.summaryPrice}>{offer ? formatDZD(offer.price * item.quantity) : "—"}</Text>
        </View>;
      })}
      {offers.isPending ? <LoadingState label={translate("cartVerifying")} /> : null}
      {offers.isError ? <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} /> : null}
      {hasBlockingItems ? <Text style={styles.errorText}>{translate("checkoutFixCart")}</Text> : null}
      <View style={styles.totalRow}>
        <Text style={styles.sectionTitle}>{translate("cartSubtotal")}</Text>
        <Text style={styles.total}>{offers.data ? formatDZD(evaluation.subtotal) : "—"}</Text>
      </View>
      <Text style={styles.fieldHint}>{translate("cartDeliveryNote")}</Text>
      <Text style={styles.fieldHint}>{translate("checkoutCodNote")}</Text>
    </View>

    {formError ? <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text> : null}
    <Pressable onPress={submit} disabled={mutation.isPending || offers.isPending || offers.isError || hasBlockingItems || wilayas.isError} style={[styles.primary, (mutation.isPending || offers.isPending || offers.isError || hasBlockingItems) && styles.disabled]}>
      {mutation.isPending ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.primaryText}>{translate("checkoutConfirm")}</Text>}
    </Pressable>

    <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.sectionTitle, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{modalTitle}</Text>
            <Pressable onPress={() => setPicker(null)} hitSlop={10}><Text style={styles.back}>{translate("back")}</Text></Pressable>
          </View>
          {((picker === "wilaya" && wilayas.isPending) || (picker === "commune" && communes.isPending)) ? <LoadingState label={translate("stateLoading")} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            {pickerItems.map((item) => <Pressable key={item.id} onPress={() => {
              if (picker === "wilaya" && item.wilaya) {
                setWilayaId(item.wilaya.id);
                setCommune("");
              } else if (picker === "commune") {
                setCommune(item.label);
              }
              setPicker(null);
            }} style={styles.pickerItem}>
              <Text style={[styles.pickerText, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{item.label}</Text>
            </Pressable>)}
            {picker === "commune" && pickerItems.length === 0 ? <Text style={styles.fieldHint}>{translate("checkoutNoCommunes")}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  back: { color: "#647D13", fontSize: 13, fontWeight: "900" },
  section: { borderRadius: 18, padding: 14, gap: 11 },
  sectionTitle: { color: "#647D13", fontSize: 15, fontWeight: "900", textAlign: "right" },
  input: { minHeight: 49, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  fieldLabel: { color: "#737373", fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 4 },
  select: { minHeight: 49, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: "#0A0A0A", fontSize: 13, fontWeight: "700", textAlign: "right" },
  placeholder: { color: "#888888" },
  fieldHint: { color: "#737373", fontSize: 11, lineHeight: 17, textAlign: "right" },
  retryText: { color: "#647D13", fontSize: 12, fontWeight: "800", textAlign: "right" },
  deliveryOptions: { flexDirection: "row-reverse", gap: 8 },
  deliveryOption: { flex: 1, minHeight: 92, borderWidth: 1, borderColor: "#D4D4D4", borderRadius: 14, padding: 10, gap: 7 },
  deliverySelected: { borderColor: "#829E19", backgroundColor: "#F0F5DF" },
  deliveryTitle: { color: "#0A0A0A", fontSize: 13, fontWeight: "900", textAlign: "right" },
  deliveryTextSelected: { color: "#536A0D" },
  deliveryHint: { color: "#737373", fontSize: 10, lineHeight: 15, textAlign: "right" },
  summaryRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  summaryInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  summaryName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  summaryPrice: { color: "#647D13", fontSize: 12, fontWeight: "900" },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  total: { color: "#647D13", fontSize: 19, fontWeight: "900" },
  errorText: { color: "#B42318", fontSize: 12, fontWeight: "800", textAlign: "right", lineHeight: 18 },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  primaryText: { color: "#0A0A0A", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  successPanel: { borderRadius: 20, padding: 20, gap: 16, alignItems: "center" },
  successMark: { width: 58, height: 58, overflow: "hidden", borderRadius: 29, backgroundColor: "#C6F135", color: "#0A0A0A", textAlign: "center", textAlignVertical: "center", fontSize: 30, fontWeight: "900" },
  orderLabel: { color: "#737373", fontSize: 12, fontWeight: "700" },
  orderId: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  hint: { color: "#737373", fontSize: 12, lineHeight: 19, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalPanel: { maxHeight: "78%", minHeight: "45%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 17, gap: 12 },
  modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  pickerItem: { minHeight: 48, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D4D4D4" },
  pickerText: { fontSize: 14, textAlign: "right", fontWeight: "700" }
});
