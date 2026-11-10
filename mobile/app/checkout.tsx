import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, CheckoutSummary, Icon, IconButton, PressableSurface, PriceDisplay, Spinner, Text as UiText, TextField } from "@/components/ui";
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
import {  translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";
import { fetchMyAddresses, type UserAddress } from "@/lib/user-address";
import { isValidAddressPhone, normalizeAddressPhone } from "@/lib/user-address-state";
import { formatOrderCode } from "@/lib/orders-state";
import { MAX_CHECKOUT_ITEMS } from "@/lib/checkout-state";

type Picker = "wilaya" | "commune" | null;

export default function CheckoutScreen() {
  const { language } = useLanguage();
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
  const [formEdited, setFormEdited] = useState(false);

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
    if (!formEdited) {
      setFullName(profile.data?.full_name ?? auth.data?.user_metadata?.["full_name"] ?? "");
      setPhone(profile.data?.phone ?? auth.data?.phone ?? "");
      setWilayaId(profile.data?.wilaya_id ?? null);
      setCommune(profile.data?.commune ?? "");
    }
    setProfileApplied(true);
  }, [profile.data, profile.isSuccess, profileApplied, auth.data, selectedAddressId, formEdited]);

  const applySavedAddress = (address: UserAddress, userInitiated = true) => {
    setSelectedAddressId(address.id);
    setProfileApplied(true);
    if (userInitiated) setFormEdited(true);
    setFullName(address.recipient_name);
    setPhone(address.phone);
    setWilayaId(address.wilaya_id);
    setCommune(address.commune);
    setAddressLine(address.address_line);
  };

  useEffect(() => {
    if (!savedAddresses.isSuccess || addressesApplied) return;
    const preferred = savedAddresses.data.find((address) => address.is_default) ?? savedAddresses.data[0];
    if (preferred && !formEdited) applySavedAddress(preferred, false);
    setAddressesApplied(true);
  }, [savedAddresses.data, savedAddresses.isSuccess, addressesApplied, formEdited]);

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
      <Card style={[styles.successPanel, { backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface }]} contentStyle={styles.successContent}>
        <UiText style={styles.successMark}>✓</UiText>
        <AppHeader title={translate("checkoutSuccessTitle")} />
        <UiText style={styles.hint}>{translate("checkoutSuccessMessage")}</UiText>
        <UiText style={styles.orderLabel}>{translate("checkoutOrderNumber")}</UiText>
        <UiText selectable style={[styles.orderId, { color: theme.colors.foreground }]}>{formatOrderCode(createdOrderId)}</UiText>
        <UiText style={styles.hint}>{translate("checkoutDeliveryAfterNote")}</UiText>
        <Button label={translate("checkoutBackHome")} onPress={() => router.replace("/home")} fullWidth />
      </Card>
    </CustomerScreen>;
  }

  if (cart.isPending || auth.isPending) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (cart.isError || auth.isError) return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={cart.isFetching || auth.isFetching} onRetry={() => { void cart.refetch(); void auth.refetch(); }} /></CustomerScreen>;
  if (!cart.data.length) return <CustomerScreen>
    <AppHeader title={translate("checkoutTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <EmptyState icon="shopping-cart" title={translate("cartEmpty")} hint={translate("cartEmptyHint")} />
    <Button label={translate("cartBrowse")} onPress={() => router.replace("/explore")} fullWidth />
  </CustomerScreen>;

  const submit = () => {
    setFormError(null);
    if (!offers.data || offers.isPending || offers.isError) {
      setFormError(translate("checkoutOffersNotReady"));
      return;
    }
    if (cart.data.length > MAX_CHECKOUT_ITEMS) {
      setFormError(translate("checkoutTooManyItems"));
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
    if (commune.trim().length < 2 || commune.trim().length > 100) {
      setFormError(translate("checkoutAreaInvalid"));
      return;
    }
    if (!addressLine.trim()) {
      setFormError(translate("checkoutAddressRequired"));
      return;
    }
    const input: CheckoutInput = {
      userId: auth.data?.id ?? "",
      items: cart.data,
      deliveryType,
      wilayaId,
      commune: commune.trim(),
      addressLine: addressLine.trim(),
      fullName: fullName.trim(),
      phone: normalizeAddressPhone(phone)
    };
    mutation.mutate(input);
  };

  const fieldStyle = [styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.inputBorder, color: theme.colors.foreground }];
  const modalTitle = picker === "wilaya" ? translate("checkoutChooseWilaya") : translate("checkoutChooseCommune");
  const pickerItems: { id: string; label: string; wilaya?: Wilaya }[] = picker === "wilaya"
    ? (wilayas.data ?? []).map((item) => ({ id: String(item.id), label: String(item.id).padStart(2, "0") + " - " + getLocalizedWilayaLabel(item.id, item.name_ar, language, item.name_fr), wilaya: item }))
    : (communes.data ?? []).map((item) => ({ id: item, label: item }));

  return <CustomerScreen
    footer={
      <Button
        label={translate("checkoutConfirm")}
        onPress={submit}
        loading={mutation.isPending}
        disabled={mutation.isPending || offers.isPending || offers.isError || hasBlockingItems || wilayas.isPending || wilayas.isError}
        fullWidth
      />
    }
  >
    <AppHeader
      title={translate("checkoutTitle")}
      leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={theme.dimensions.iconSize.md} accessibilityHidden />} />}
    />
    <UiText style={styles.fieldHint}>{translate("checkoutSubtitle")}</UiText>

    <Card style={styles.sectionCard} contentStyle={styles.section}>
      <UiText style={styles.sectionTitle}>{translate("checkoutContactTitle")}</UiText>
      <PressableSurface accessibilityLabel={translate("deliveryProfileManage")} onPress={() => router.push("/delivery-profile")} hitSlop={8}>
        <UiText style={styles.retryText}>{translate("deliveryProfileManage")}</UiText>
      </PressableSurface>
      <UiText style={styles.fieldLabel}>{translate("fullName")}</UiText>
      <TextField accessibilityLabel={translate("fullNamePlaceholder")} value={fullName} onChangeText={(value) => { setFormEdited(true); setSelectedAddressId(null); setFullName(value); }} placeholder={translate("fullNamePlaceholder")} style={fieldStyle} textAlign="auto" maxLength={120} />
      <UiText style={styles.fieldLabel}>{translate("checkoutPhoneLabel")}</UiText>
      <TextField accessibilityLabel={translate("checkoutPhonePlaceholder")} value={phone} onChangeText={(value) => { setFormEdited(true); setSelectedAddressId(null); setPhone(value); }} placeholder={translate("checkoutPhonePlaceholder")} style={fieldStyle} textAlign="auto" keyboardType="phone-pad" maxLength={20} />
    </Card>

    <Card style={styles.sectionCard} contentStyle={styles.section}>
      <UiText style={styles.sectionTitle}>{translate("checkoutDeliveryTitle")}</UiText>
      {savedAddresses.isPending ? (
        <LoadingState label={translate("checkoutAddressesLoading")} />
      ) : savedAddresses.isError ? (
        <PressableSurface accessibilityLabel={translate("checkoutSavedAddressesError")} onPress={() => void savedAddresses.refetch()}><UiText style={styles.retryText}>{translate("checkoutSavedAddressesError")}</UiText></PressableSurface>
      ) : savedAddresses.data && savedAddresses.data.length > 0 ? (
        <View style={styles.savedAddresses}>
          <View style={styles.savedHeader}>
            <UiText style={styles.fieldLabel}>{translate("checkoutSavedAddresses")}</UiText>
            <PressableSurface accessibilityLabel={translate("checkoutManageAddresses")} onPress={() => router.push("/addresses")}><UiText style={styles.retryText}>{translate("checkoutManageAddresses")}</UiText></PressableSurface>
          </View>
          {savedAddresses.data.map((address) => (
            <PressableSurface
              key={address.id}
              accessibilityRole="radio"
              accessibilityLabel={address.recipient_name + "، " + address.commune}
              accessibilityState={{ selected: selectedAddressId === address.id }}
              onPress={() => applySavedAddress(address)}
              style={[styles.savedAddress, selectedAddressId === address.id && styles.savedAddressSelected]}
            >
              <View style={styles.savedAddressTop}>
                <UiText style={[styles.savedAddressName, selectedAddressId === address.id && theme.mode === "dark" && { color: theme.colors.accentMuted }]}>{address.recipient_name}</UiText>
                <View style={[styles.radio, selectedAddressId === address.id && styles.radioSelected]} />
              </View>
              <UiText style={[styles.fieldHint, selectedAddressId === address.id && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{address.phone}</UiText>
              <UiText style={[styles.fieldHint, selectedAddressId === address.id && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{String(address.wilaya_id).padStart(2, "0")} - {getLocalizedWilayaLabel(address.wilaya_id, wilayas.data?.find((item) => item.id === address.wilaya_id)?.name_ar ?? "", language, wilayas.data?.find((item) => item.id === address.wilaya_id)?.name_fr)}، {address.commune}</UiText>
              <UiText style={[styles.fieldHint, selectedAddressId === address.id && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{address.address_line}</UiText>
              {address.is_default ? <UiText style={[styles.savedDefault, selectedAddressId === address.id && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{translate("addressesDefault")}</UiText> : null}
            </PressableSurface>
          ))}
        </View>
      ) : (
        <PressableSurface accessibilityLabel={translate("checkoutAddSavedAddress")} onPress={() => router.push("/addresses")}><UiText style={styles.retryText}>{translate("checkoutAddSavedAddress")}</UiText></PressableSurface>
      )}
      <View style={styles.deliveryOptions}>
        <PressableSurface
          accessibilityRole="radio"
          accessibilityLabel={translate("checkoutHomeDelivery")}
          accessibilityState={{ selected: deliveryType === "home" }}
          onPress={() => setDeliveryType("home")}
          style={[styles.deliveryOption, deliveryType === "home" && styles.deliverySelected]}
        >
          <UiText style={[styles.deliveryTitle, deliveryType === "home" && styles.deliveryTextSelected]}>{translate("checkoutHomeDelivery")}</UiText>
          <UiText style={[styles.deliveryHint, deliveryType === "home" && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{translate("checkoutHomeDeliveryHint")}</UiText>
        </PressableSurface>
        <PressableSurface
          accessibilityRole="radio"
          accessibilityLabel={translate("checkoutStorePickup")}
          accessibilityState={{ selected: deliveryType === "desk" }}
          onPress={() => setDeliveryType("desk")}
          style={[styles.deliveryOption, deliveryType === "desk" && styles.deliverySelected]}
        >
          <UiText style={[styles.deliveryTitle, deliveryType === "desk" && styles.deliveryTextSelected]}>{translate("checkoutStorePickup")}</UiText>
          <UiText style={[styles.deliveryHint, deliveryType === "desk" && theme.mode === "light" && { color: theme.colors.accentForeground }]}>{translate("checkoutStorePickupHint")}</UiText>
        </PressableSurface>
      </View>

      <UiText style={styles.fieldLabel}>{translate("checkoutWilaya")}</UiText>
      <PressableSurface accessibilityLabel={translate("checkoutWilaya")} onPress={() => { setFormEdited(true); setSelectedAddressId(null); setPicker("wilaya"); }} disabled={wilayas.isPending || wilayas.isError} style={[styles.select, { backgroundColor: theme.colors.surfaceMuted }]}>
        <UiText style={[styles.selectText, !selectedWilaya && styles.placeholder]}>{selectedWilaya ? String(selectedWilaya.id).padStart(2, "0") + " - " + getLocalizedWilayaLabel(selectedWilaya.id, selectedWilaya.name_ar, language, selectedWilaya.name_fr) : wilayas.isError ? translate("checkoutWilayaError") : translate("checkoutChooseWilaya")}</UiText>
        {wilayas.isPending ? <Spinner size="small" /> : null}
      </PressableSurface>
      {wilayas.isError ? <PressableSurface accessibilityLabel={translate("retry")} onPress={() => void wilayas.refetch()}><UiText style={styles.retryText}>{translate("retry")}</UiText></PressableSurface> : null}

      <UiText style={styles.fieldLabel}>{translate("checkoutCommune")}</UiText>
      {communes.data && communes.data.length > 0 ? (
        <PressableSurface accessibilityLabel={translate("checkoutCommune")} onPress={() => setPicker("commune")} style={[styles.select, { backgroundColor: theme.colors.surfaceMuted }]} disabled={!wilayaId}>
          <UiText style={[styles.selectText, !commune && styles.placeholder]}>{commune || translate("checkoutChooseCommune")}</UiText>
        </PressableSurface>
      ) : (
        <TextField accessibilityLabel={translate("checkoutCommune")} value={commune} onChangeText={(value) => { setFormEdited(true); setSelectedAddressId(null); setCommune(value); }} placeholder={translate("checkoutCommunePlaceholder")} style={fieldStyle} textAlign="auto" maxLength={100} editable={wilayaId !== null && !communes.isPending} />
      )}
      {communes.isError ? <UiText style={styles.fieldHint}>{translate("checkoutCommunesFallback")}</UiText> : null}

      <UiText style={styles.fieldLabel}>{translate("checkoutAddress")}</UiText>
      <TextField accessibilityLabel={translate("checkoutAddress")} value={addressLine} onChangeText={(value) => { setFormEdited(true); setSelectedAddressId(null); setAddressLine(value); }} placeholder={translate("checkoutAddressPlaceholder")} style={[...fieldStyle, styles.multiline]} textAlign="auto" multiline maxLength={300} />
    </Card>

    <CheckoutSummary style={styles.summaryCard}>
      <UiText style={styles.sectionTitle}>{translate("checkoutSummary")}</UiText>
      {cart.data.map((item) => {
        const offer = offerById.get(item.offerId);
        const optionSummary = Object.entries(normalizeCartOptions(item.options)).map(([optionName, value]) => (optionName === "size" ? translate("productSizeOption") : optionName === "color" ? translate("productColorOption") : optionName) + ": " + value).join(" · ");
        return <View key={cartLineKey(item)} style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <UiText style={[styles.summaryName, { color: theme.colors.foreground }]}>{offer?.product.name ?? item.name ?? translate("cartUnknownStore")}</UiText>
            {offer?.store.name ? <UiText style={styles.fieldHint}>{translate("checkoutStoreLabel")}: {offer.store.name}</UiText> : null}
            <UiText style={styles.fieldHint}>{translate("checkoutQuantity")}: {item.quantity}</UiText>
            {optionSummary ? <UiText style={styles.fieldHint}>{optionSummary}</UiText> : null}
          </View>
          <UiText style={styles.summaryPrice}>{offer ? formatDZD(offer.price * item.quantity) : "—"}</UiText>
        </View>;
      })}
      {offers.isPending ? <LoadingState label={translate("cartVerifying")} /> : null}
      {offers.isError ? <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={offers.isFetching} onRetry={() => void offers.refetch()} /> : null}
      {hasBlockingItems ? <UiText style={styles.errorText}>{translate("checkoutFixCart")}</UiText> : null}
      <View style={styles.totalRow}>
        <UiText style={styles.totalLabel}>{translate("checkoutProductsTotal")}</UiText>
        <PriceDisplay value={offers.data ? formatDZD(evaluation.subtotal) : "—"} style={styles.totalDisplay} />
      </View>
      <View style={styles.shippingRow}>
        <UiText style={styles.fieldHint}>{translate("checkoutShippingFee")}</UiText>
        <UiText style={styles.shippingValue}>{deliveryType === "desk" ? translate("checkoutPickupFree") : translate("checkoutShippingPending")}</UiText>
      </View>
      {deliveryType === "home" ? <UiText style={styles.fieldHint}>{translate("checkoutFinalTotalPending")}</UiText> : null}
    </CheckoutSummary>

    <Card style={styles.sectionCard} contentStyle={styles.paymentSection}>
      <UiText style={styles.sectionTitle}>{translate("checkoutPaymentTitle")}</UiText>
      <View style={styles.paymentMethod}>
        <Icon name="wallet" size={24} color={theme.colors.accentMuted} accessibilityHidden />
        <View style={styles.paymentInfo}>
          <UiText style={styles.paymentTitle}>{translate("checkoutPaymentCod")}</UiText>
          <UiText style={styles.fieldHint}>{translate("checkoutPaymentCodHint")}</UiText>
        </View>
        <Icon name="circle-check" size={20} color={theme.colors.success} accessibilityHidden />
      </View>
    </Card>

    {formError ? <UiText accessibilityRole="alert" style={styles.errorText}>{formError}</UiText> : null}
    <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{modalTitle}</UiText>
            <PressableSurface accessibilityLabel={translate("back")} onPress={() => setPicker(null)} hitSlop={10}><UiText style={styles.back}>{translate("back")}</UiText></PressableSurface>
          </View>
          {((picker === "wilaya" && wilayas.isPending) || (picker === "commune" && communes.isPending)) ? <LoadingState label={translate("stateLoading")} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            {pickerItems.map((item) => <PressableSurface key={item.id} onPress={() => {
              if (picker === "wilaya" && item.wilaya) {
                setFormEdited(true);
                setWilayaId(item.wilaya.id);
                setCommune("");
                setAddressLine("");
              } else if (picker === "commune") {
                setFormEdited(true);
                setCommune(item.label);
              }
              setPicker(null);
            }} style={styles.pickerItem}>
              <UiText style={[styles.pickerText, { color: theme.colors.foreground }]}>{item.label}</UiText>
            </PressableSurface>)}
            {picker === "commune" && pickerItems.length === 0 ? <UiText style={styles.fieldHint}>{translate("checkoutNoCommunes")}</UiText> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  back: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
  sectionCard: { borderRadius: designTokens.radius.xl },
  section: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  summaryCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  paymentSection: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  paymentMethod: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
  paymentInfo: { flex: 1, gap: designTokens.spacing.xs, alignItems: "flex-start" },
  paymentTitle: { color: theme.colors.foreground, fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  totalDisplay: { justifyContent: "flex-start" },
  sectionTitle: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  input: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, fontSize: designTokens.typography.body },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  fieldLabel: { color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto", marginTop: 4 },
  select: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: theme.colors.foreground, fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.bold, textAlign: "auto" },
  placeholder: { color: theme.colors.placeholder },
  fieldHint: { color: theme.colors.muted, fontSize: designTokens.typography.caption, lineHeight: 17, textAlign: "auto" },
  retryText: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  savedAddresses: { gap: designTokens.spacing.sm },
  savedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  savedAddress: { borderWidth: theme.mode === "light" ? 0 : 1, borderColor: theme.colors.border, backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface, borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md, gap: designTokens.spacing.xs },
  savedAddressSelected: { borderColor: theme.mode === "light" ? theme.colors.accent : theme.colors.accentMuted, backgroundColor: theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceSecondary },
  savedAddressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  savedAddressName: { color: theme.colors.foreground, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
  savedDefault: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: theme.colors.muted },
  radioSelected: { borderWidth: 5, borderColor: theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted },
  deliveryOptions: { flexDirection: "row", gap: designTokens.spacing.sm },
  deliveryOption: { flex: 1, minHeight: 92, borderWidth: theme.mode === "light" ? 0 : 1, borderColor: theme.colors.border, backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface, borderRadius: designTokens.radius.md, padding: designTokens.spacing.md, gap: designTokens.spacing.sm },
  deliverySelected: { borderColor: theme.mode === "light" ? theme.colors.accent : theme.colors.accentMuted, backgroundColor: theme.mode === "light" ? theme.colors.accent : theme.colors.surfaceSecondary },
  deliveryTitle: { color: theme.colors.foreground, fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  deliveryTextSelected: { color: theme.mode === "light" ? theme.colors.accentForeground : theme.colors.accentMuted },
  deliveryHint: { color: theme.colors.muted, fontSize: designTokens.typography.caption - 1, lineHeight: 15, textAlign: "auto" },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summaryInfo: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  summaryName: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  summaryPrice: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  totalLabel: { color: theme.colors.foreground, fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  shippingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: designTokens.spacing.md },
  shippingValue: { flex: 1, color: theme.colors.accentMuted, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.bold, textAlign: "auto" },
  errorText: { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto", lineHeight: 18 },
  successPanel: { borderRadius: designTokens.radius.lg },
  successContent: { padding: designTokens.spacing.xl, gap: designTokens.spacing.lg, alignItems: "center" },
  successMark: { width: 58, height: 58, overflow: "hidden", borderRadius: 29, backgroundColor: theme.colors.accent, color: theme.colors.accentForeground, textAlign: "center", textAlignVertical: "center", fontSize: designTokens.typography.display + 1, fontWeight: designTokens.fontWeights.extrabold },
  orderLabel: { color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.bold },
  orderId: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  hint: { color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  modalPanel: { maxHeight: "78%", minHeight: "45%", borderTopLeftRadius: designTokens.radius.xl, borderTopRightRadius: designTokens.radius.xl, padding: designTokens.spacing.xl, gap: designTokens.spacing.md },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerItem: { minHeight: 48, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  pickerText: { fontSize: designTokens.typography.body, textAlign: "auto", fontWeight: designTokens.fontWeights.bold }
}); }

