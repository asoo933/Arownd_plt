import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchOffersByIds, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { CART_QUERY_KEY, getCart, removeFromCart, updateCartQuantity } from "@/lib/cart";
import { cartLineKey, evaluateCart, type CartItem } from "@/lib/cart-state";
import { translate } from "@/lib/i18n";

export default function CartScreen() {
  const dark = useColorScheme() === "dark";
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const ids = cart.data?.map((item) => item.offerId) ?? [];
  const offers = useQuery({
    queryKey: ["customer-cart-offers", ids],
    queryFn: () => fetchOffersByIds(ids),
    enabled: cart.isSuccess && ids.length > 0
  });
  const mutation = useMutation({
    mutationFn: (action: { type: "remove"; key: string } | { type: "quantity"; key: string; quantity: number }) =>
      action.type === "remove" ? removeFromCart(action.key) : updateCartQuantity(action.key, action.quantity),
    onSuccess: (next) => {
      queryClient.setQueryData(CART_QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: ["customer-cart-offers"] });
    }
  });

  if (cart.isPending) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (cart.isError) return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void cart.refetch()} /></CustomerScreen>;
  if (cart.data.length === 0) return <CustomerScreen>
    <CustomerHeading title={translate("cartTitle")} subtitle={translate("cartSubtitle")} />
    <EmptyState title={translate("cartEmpty")} hint={translate("cartEmptyHint")} />
    <Pressable onPress={() => router.push("/explore")} style={styles.primary}><Text style={styles.primaryText}>{translate("cartBrowse")}</Text></Pressable>
  </CustomerScreen>;

  const evaluation = evaluateCart(cart.data, offers.data);
  const offerById = new Map((offers.data ?? []).map((offer) => [offer.id, offer]));
  const groups = new Map<string, { storeName: string; items: CartItem[] }>();
  for (const item of cart.data) {
    const storeName = offerById.get(item.offerId)?.store.name ?? translate("cartUnknownStore");
    const group = groups.get(item.offerId);
    if (group) group.items.push(item);
    else groups.set(item.offerId, { storeName, items: [item] });
  }
  const issueLabels = {
    missing: translate("cartIssueMissing"),
    unavailable: translate("cartIssueUnavailable"),
    outOfStock: translate("cartIssueOutOfStock"),
    overStock: translate("cartIssueOverStock"),
    priceChanged: translate("cartIssuePriceChanged")
  };

  return <CustomerScreen>
    <CustomerHeading title={translate("cartTitle")} subtitle={translate("cartItemsCount") + cart.data.reduce((sum, item) => sum + item.quantity, 0)} />
    {offers.isError ? <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} /> : null}
    {offers.isPending ? <LoadingState label={translate("cartVerifying")} /> : null}
    {evaluation.blockingCount > 0 ? <View style={styles.warning}><Text style={styles.warningText}>{translate("cartBlocked") + evaluation.blockingCount}</Text></View> : null}
    {[...groups.entries()].map(([offerId, group]) => <View key={offerId} style={[styles.group, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.store}>{group.storeName}</Text>
      {group.items.map((item) => {
        const key = cartLineKey(item);
        const offer = offerById.get(item.offerId);
        const line = evaluation.lines.find((entry) => cartLineKey(entry.item) === key);
        const image = offer ? getPrimaryImage(offer) : null;
        const currentPrice = offer?.price ?? item.price ?? 0;
        const blocking = line?.issues.some((issue) => issue !== "priceChanged") ?? false;
        const totalRequestedForOffer = cart.data.filter((entry) => entry.offerId === item.offerId).reduce((sum, entry) => sum + entry.quantity, 0);
        return <View key={key} style={styles.line}>
          <Pressable accessibilityRole="button" onPress={() => item.productId ? router.push({ pathname: "/product/[productId]", params: { productId: item.productId } }) : undefined} style={styles.lineMain}>
            <View style={styles.thumb}>{image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.imageMark}>▧</Text>}</View>
            <View style={styles.details}>
              <Text style={[styles.name, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{offer?.product.name ?? item.name}</Text>
              <Text style={styles.options}>{Object.entries(item.options).map(([optionName, value]) => optionName + ": " + value).join(" · ")}</Text>
              {line?.issues.map((issue) => <Text key={issue} style={[styles.issue, issue === "priceChanged" && styles.priceIssue]}>{issueLabels[issue]}</Text>)}
              <Text style={styles.price}>{formatDZD(currentPrice)}</Text>
            </View>
          </Pressable>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel={translate("cartDecrease")} disabled={item.quantity <= 1 || mutation.isPending} onPress={() => mutation.mutate({ type: "quantity", key, quantity: item.quantity - 1 })} style={styles.stepper}><Text style={styles.stepperText}>−</Text></Pressable>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={translate("cartIncrease")} disabled={item.quantity >= 10 || mutation.isPending || (offer ? totalRequestedForOffer >= offer.stock_quantity : false)} onPress={() => mutation.mutate({ type: "quantity", key, quantity: item.quantity + 1 })} style={styles.stepper}><Text style={styles.stepperText}>+</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={translate("cartRemove")} disabled={mutation.isPending} onPress={() => mutation.mutate({ type: "remove", key })} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>
          </View>
          {blocking ? <Text style={styles.blockedHint}>{translate("cartLineBlocked")}</Text> : null}
        </View>;
      })}
    </View>)}
    <View style={[styles.summary, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{translate("cartSubtotal")}</Text><Text style={styles.total}>{formatDZD(evaluation.subtotal)}</Text></View>
      <Text style={styles.note}>{translate("cartDeliveryNote")}</Text>
      <Pressable disabled style={[styles.primary, styles.disabled]}>
        <Text style={styles.primaryText}>{translate("cartCheckout")}</Text>
      </Pressable>
      <Text style={styles.note}>{translate("cartCheckoutComing")}</Text>
    </View>
  </CustomerScreen>;
}

const styles = StyleSheet.create({
  group: { borderRadius: 18, padding: 13, gap: 12 },
  store: { color: "#647D13", fontSize: 13, fontWeight: "900", textAlign: "right" },
  line: { borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 12, gap: 8 },
  lineMain: { flexDirection: "row-reverse", gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: 13, backgroundColor: "#ECEFE4", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageMark: { color: "#829E19", fontSize: 28 },
  details: { flex: 1, alignItems: "flex-end", gap: 4 },
  name: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  options: { color: "#737373", fontSize: 11, textAlign: "right" },
  issue: { color: "#B45309", fontSize: 11, fontWeight: "700", textAlign: "right" },
  priceIssue: { color: "#9A6700" },
  price: { color: "#647D13", fontSize: 13, fontWeight: "900" },
  controls: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  stepper: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F0F2E8", alignItems: "center", justifyContent: "center" },
  stepperText: { color: "#0A0A0A", fontSize: 20, fontWeight: "900" },
  quantity: { minWidth: 25, textAlign: "center", color: "#0A0A0A", fontWeight: "900" },
  remove: { marginStart: "auto", minWidth: 38, minHeight: 38, alignItems: "center", justifyContent: "center" },
  removeText: { color: "#B42318", fontSize: 22, fontWeight: "800" },
  blockedHint: { color: "#B42318", fontSize: 11, textAlign: "right" },
  warning: { backgroundColor: "#FDECEC", borderRadius: 13, padding: 12 },
  warningText: { color: "#B42318", fontSize: 12, fontWeight: "800", textAlign: "right" },
  summary: { borderRadius: 18, padding: 15, gap: 12 },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#737373", fontSize: 13, fontWeight: "700" },
  total: { color: "#647D13", fontSize: 19, fontWeight: "900" },
  note: { color: "#737373", fontSize: 11, lineHeight: 18, textAlign: "right" },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0A0A0A", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.4 }
});
