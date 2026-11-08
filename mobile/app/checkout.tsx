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
  View
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
import { cartLineKey, evaluateCart, normalizeCartOptions } from "@/lib/cart-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";
import { fetchMyAddresses, type UserAddress } from "@/lib/user-address";
import { isValidAddressPhone, normalizeAddressPhone } from "@/lib/user-address-state";

type Picker = "wilaya" | "commune" | null;

export default function CheckoutScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
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
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressesApplied, setAddressesApplied] = useState(false);

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
  const savedAddresses = useQuery({
    queryKey: ["my-addresses"],
    queryFn: fetchMyAddresses,
    enabled: auth.data !== undefined && auth.data !== null
  });

  useEffect(() => {
    if (auth.data === null) {
      router.replace("/login");
      return;
    }
    if (!profile.isSuccess || profileApplied || selectedAddressId !== null) return;
    setFullName(profile.data?.full_name ?? auth.data?.user_metadata?.["full_name"] ?? "");
    setPhone(profile.data?.phone ?? auth.data?.phone ?? "");
    setWilayaId(profile.data?.wilaya_id ?? null);
    setCommune(profile.data?.commune ?? "");
    setProfileApplied(true);
  }, [profile.data, profile.isSuccess, profileApplied, auth.data, selectedAddressId]);

  const applySavedAddress = (address: UserAddress) => {
    setSelectedAddressId(address.id);
    setProfileApplied(true);
    setFullName(address.recipient_name);
    setPhone(address.phone);
    setWilayaId(address.wilaya_id);
    setCommune(address.commune);
    setAddressLine(address.address_line);
  };

  useEffect(() => {
    if (!savedAddresses.isSuccess || addressesApplied) return;
    const preferred = savedAddresses.data.find((address) => address.is_default) ?? savedAddresses.data[0];
    if (preferred) applySavedAddress(preferred);
    setAddressesApplied(true);
  }, [savedAddresses.data, savedAddresses.isSuccess, addressesApplied]);

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
      <View style={[styles.successPanel, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.successMark}>✓</Text>
        <CustomerHeading title={translate("checkoutSuccessTitle")} subtitle={translate("checkoutSuccessMessage")} />
        <Text style={styles.orderLabel}>{translate("checkoutOrderNumber")}</Text>
        <Text selectable style={[styles.orderId, { color: theme.colors.foreground }]}>{createdOrderId}</Text>
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
    if (!isValidAddressPhone(phone)) {
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
      phone: normalizeAddressPhone(phone)
    };
    mutation.mutate(input);
  };

  const fieldStyle = [styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.foreground }];
  const modalTitle = picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune");
  const pickerItems: { id: string; label: string; wilaya?: Wilaya }[] = picker === "wilaya"
    ? (wilayas.data ?? []).map((item) => ({ id: String(item.id), label: String(item.id).padStart(2, "0") + " - " + item.name_ar, wilaya: item }))
    : (communes.data ?? []).map((item) => ({ id: item, label: item }));

  return <CustomerScreen>
    <View style={styles.topRow}>
      <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>{translate("back")}</Text></Pressable>
      <CustomerHeading title={translate("checkoutTitle")} subtitle={translate("checkoutSubtitle")} />
    </View>

    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutContactTitle")}</Text>
      <Pressable onPress={() => router.push("/delivery-profile")} hitSlop={8}>
        <Text style={styles.retryText}>{translate("deliveryProfileManage")}</Text>
      </Pressable>
      <TextInput value={fullName} onChangeText={(value) => { setSelectedAddressId(null); setFullName(value); }} placeholder={translate("fullNamePlaceholder")} placeholderTextColor={theme.colors.placeholder} style={fieldStyle} textAlign="right" maxLength={120} />
      <TextInput value={phone} onChangeText={(value) => { setSelectedAddressId(null); setPhone(value); }} placeholder={translate("checkoutPhonePlaceholder")} placeholderTextColor={theme.colors.placeholder} style={fieldStyle} textAlign="right" keyboardType="phone-pad" maxLength={20} />
    </View>

    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutDeliveryTitle")}</Text>
      {savedAddresses.isError ? (
        <Pressable onPress={() => void savedAddresses.refetch()}><Text style={styles.retryText}>{translate("checkoutSavedAddressesError")}</Text></Pressable>
      ) : savedAddresses.data && savedAddresses.data.length > 0 ? (
        <View style={styles.savedAddresses}>
          <View style={styles.savedHeader}>
            <Text style={styles.fieldLabel}>{translate("checkoutSavedAddresses")}</Text>
            <Pressable onPress={() => router.push("/addresses")}><Text style={styles.retryText}>{translate("checkoutManageAddresses")}</Text></Pressable>
          </View>
          {savedAddresses.data.map((address) => (
            <Pressable key={address.id} onPress={() => applySavedAddress(address)} style={[styles.savedAddress, selectedAddressId === address.id && styles.savedAddressSelected]}>
              <View style={styles.savedAddressTop}>
                <Text style={styles.savedAddressName}>{address.recipient_name}</Text>
                <View style={[styles.radio, selectedAddressId === address.id && styles.radioSelected]} />
              </View>
              <Text style={styles.fieldHint}>{address.phone}</Text>
              <Text style={styles.fieldHint}>{String(address.wilaya_id).padStart(2, "0")} - {wilayas.data?.find((item) => item.id === address.wilaya_id)?.name_ar ?? ""}، {address.commune}</Text>
              <Text style={styles.fieldHint}>{address.address_line}</Text>
              {address.is_default ? <Text style={styles.savedDefault}>{translate("addressesDefault")}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => router.push("/addresses")}><Text style={styles.retryText}>{translate("checkoutAddSavedAddress")}</Text></Pressable>
      )}
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
      <Pressable onPress={() => { setSelectedAddressId(null); setPicker("wilaya"); }} disabled={wilayas.isPending || wilayas.isError} style={[styles.select, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Text style={[styles.selectText, !selectedWilaya && styles.placeholder]}>{selectedWilaya ? String(selectedWilaya.id).padStart(2, "0") + " - " + selectedWilaya.name_ar : wilayas.isError ? translate("checkoutWilayaError") : translate("checkoutChooseWilaya")}</Text>
        {wilayas.isPending ? <ActivityIndicator size="small" /> : null}
      </Pressable>
      {wilayas.isError ? <Pressable onPress={() => void wilayas.refetch()}><Text style={styles.retryText}>{translate("retry")}</Text></Pressable> : null}

      <Text style={styles.fieldLabel}>{translate("checkoutCommune")}</Text>
      {communes.data && communes.data.length > 0 ? (
        <Pressable onPress={() => setPicker("commune")} style={[styles.select, { backgroundColor: theme.colors.surfaceMuted }]} disabled={!wilayaId}>
          <Text style={[styles.selectText, !commune && styles.placeholder]}>{commune || translate("checkoutChooseCommune")}</Text>
        </Pressable>
      ) : (
        <TextInput value={commune} onChangeText={(value) => { setSelectedAddressId(null); setCommune(value); }} placeholder={translate("checkoutCommunePlaceholder")} placeholderTextColor={theme.colors.placeholder} style={fieldStyle} textAlign="right" editable={wilayaId !== null && !communes.isPending} />
      )}
      {communes.isError ? <Text style={styles.fieldHint}>{translate("checkoutCommunesFallback")}</Text> : null}

      {deliveryType === "home" ? <>
        <Text style={styles.fieldLabel}>{translate("checkoutAddress")}</Text>
        <TextInput value={addressLine} onChangeText={(value) => { setSelectedAddressId(null); setAddressLine(value); }} placeholder={translate("checkoutAddressPlaceholder")} placeholderTextColor={theme.colors.placeholder} style={[...fieldStyle, styles.multiline]} textAlign="right" multiline maxLength={300} />
      </> : <Text style={styles.fieldHint}>{translate("checkoutPickupNote")}</Text>}
    </View>

    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("checkoutSummary")}</Text>
      {cart.data.map((item) => {
        const offer = offerById.get(item.offerId);
        const optionSummary = Object.entries(normalizeCartOptions(item.options)).map(([optionName, value]) => (optionName === "size" ? translate("productSizeOption") : optionName === "color" ? translate("productColorOption") : optionName) + ": " + value).join(" · ");
        return <View key={cartLineKey(item)} style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryName, { color: theme.colors.foreground }]}>{offer?.product.name ?? item.name ?? translate("cartUnknownStore")}</Text>
            <Text style={styles.fieldHint}>{translate("checkoutQuantity")}: {item.quantity}</Text>
            {optionSummary ? <Text style={styles.fieldHint}>{optionSummary}</Text> : null}
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
      {mutation.isPending ? <ActivityIndicator color={theme.colors.foreground} /> : <Text style={styles.primaryText}>{translate("checkoutConfirm")}</Text>}
    </Pressable>

    <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{modalTitle}</Text>
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
              <Text style={[styles.pickerText, { color: theme.colors.foreground }]}>{item.label}</Text>
            </Pressable>)}
            {picker === "commune" && pickerItems.length === 0 ? <Text style={styles.fieldHint}>{translate("checkoutNoCommunes")}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  topRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  back: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  section: { borderRadius: 18, padding: 14, gap: 11 },
  sectionTitle: { color: theme.colors.accentMuted, fontSize: 15, fontWeight: "900", textAlign: "right" },
  input: { minHeight: 49, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  fieldLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 4 },
  select: { minHeight: 49, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: theme.colors.foreground, fontSize: 13, fontWeight: "700", textAlign: "right" },
  placeholder: { color: theme.colors.placeholder },
  fieldHint: { color: theme.colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" },
  retryText: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  savedAddresses: { gap: 8 },
  savedHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  savedAddress: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 11, gap: 4 },
  savedAddressSelected: { borderColor: theme.colors.accentMuted, backgroundColor: theme.colors.successSurface },
  savedAddressTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  savedAddressName: { color: theme.colors.foreground, fontSize: 12, fontWeight: "900" },
  savedDefault: { color: theme.colors.accentMuted, fontSize: 10, fontWeight: "900", textAlign: "right" },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: theme.colors.muted },
  radioSelected: { borderWidth: 5, borderColor: theme.colors.accentMuted },
  deliveryOptions: { flexDirection: "row-reverse", gap: 8 },
  deliveryOption: { flex: 1, minHeight: 92, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 10, gap: 7 },
  deliverySelected: { borderColor: theme.colors.accentMuted, backgroundColor: theme.colors.successSurface },
  deliveryTitle: { color: theme.colors.foreground, fontSize: 13, fontWeight: "900", textAlign: "right" },
  deliveryTextSelected: { color: theme.colors.accentMuted },
  deliveryHint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, textAlign: "right" },
  summaryRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summaryInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  summaryName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  summaryPrice: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "900" },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  total: { color: theme.colors.accentMuted, fontSize: 19, fontWeight: "900" },
  errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: "800", textAlign: "right", lineHeight: 18 },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  primaryText: { color: theme.colors.foreground, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  successPanel: { borderRadius: 20, padding: 20, gap: 16, alignItems: "center" },
  successMark: { width: 58, height: 58, overflow: "hidden", borderRadius: 29, backgroundColor: theme.colors.accent, color: theme.colors.foreground, textAlign: "center", textAlignVertical: "center", fontSize: 30, fontWeight: "900" },
  orderLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  orderId: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  hint: { color: theme.colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  modalPanel: { maxHeight: "78%", minHeight: "45%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 17, gap: 12 },
  modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  pickerItem: { minHeight: 48, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  pickerText: { fontSize: 14, textAlign: "right", fontWeight: "700" }
}); }

