import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { Button, IconButton, PressableSurface, QuantityStepper } from "@/components/ui";
import { fetchOffersByIds, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { CART_QUERY_KEY, getCart, removeFromCart, updateCartQuantity } from "@/lib/cart";
import { cartLineKey, evaluateCart, normalizeCartOptions, type CartItem } from "@/lib/cart-state";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export default function CartScreen() {
  const theme = useAppTheme();
  const style = styles(theme);
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
    <Button label={translate("cartBrowse")} onPress={() => router.push("/explore")} fullWidth />
  </CustomerScreen>;

  const evaluation = evaluateCart(cart.data, offers.data);
  const offerById = new Map((offers.data ?? []).map((offer) => [offer.id, offer]));
  const groups = new Map<string, { storeName: string; items: CartItem[] }>();
  for (const item of cart.data) {
    const currentOffer = offerById.get(item.offerId);
    const storeName = currentOffer?.store.name ?? translate("cartUnknownStore");
    const storeKey = currentOffer?.store.id ?? "missing:" + item.offerId;
    const group = groups.get(storeKey);
    if (group) group.items.push(item);
    else groups.set(storeKey, { storeName, items: [item] });
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
    {mutation.isError ? <Text style={style.warningText}>{translate("genericError")}</Text> : null}
    {evaluation.blockingCount > 0 ? <View style={style.warning}><Text style={style.warningText}>{translate("cartBlocked") + evaluation.blockingCount}</Text></View> : null}
    {[...groups.entries()].map(([offerId, group]) => <View key={offerId} style={[style.group, { backgroundColor: theme.colors.surface }]}>
      <Text style={style.store}>{group.storeName}</Text>
      {group.items.map((item) => {
        const key = cartLineKey(item);
        const offer = offerById.get(item.offerId);
        const line = evaluation.lines.find((entry) => cartLineKey(entry.item) === key);
        const image = offer ? getPrimaryImage(offer) : null;
        const currentPrice = offer?.price ?? item.price ?? 0;
        const blocking = (line?.issues.length ?? 0) > 0;
        const totalRequestedForOffer = cart.data.filter((entry) => entry.offerId === item.offerId).reduce((sum, entry) => sum + entry.quantity, 0);
        return <View key={key} style={style.line}>
          <PressableSurface
            accessibilityLabel={offer?.product.name ?? item.name}
            disabled={!item.productId}
            onPress={() => { if (item.productId) router.push({ pathname: "/product/[productId]", params: { productId: item.productId } }); }}
            style={style.lineMain}
          >
            <View style={style.thumb}>{image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={style.imageMark}>▧</Text>}</View>
            <View style={style.details}>
              <Text style={[style.name, { color: theme.colors.foreground }]}>{offer?.product.name ?? item.name}</Text>
              <Text style={style.options}>{Object.entries(normalizeCartOptions(item.options)).map(([optionName, value]) => (optionName === "size" ? translate("productSizeOption") : optionName === "color" ? translate("productColorOption") : optionName) + ": " + value).join(" · ")}</Text>
              {line?.issues.map((issue) => <Text key={issue} style={[style.issue, issue === "priceChanged" && style.priceIssue]}>{issueLabels[issue]}</Text>)}
              <Text style={style.price}>{formatDZD(currentPrice * item.quantity)}</Text>
              {item.quantity > 1 ? <Text style={style.options}>{formatDZD(currentPrice)} × {item.quantity}</Text> : null}
            </View>
          </PressableSurface>
          <View style={style.controls}>
            <QuantityStepper
              value={item.quantity}
              max={Math.min(10, offer ? Math.max(item.quantity, offer.stock_quantity - (totalRequestedForOffer - item.quantity)) : 10)}
              onChange={(quantity) => mutation.mutate({ type: "quantity", key, quantity })}
              decreaseLabel={translate("cartDecrease")}
              increaseLabel={translate("cartIncrease")}
              disabled={mutation.isPending}
            />
            <IconButton
              accessibilityLabel={translate("cartRemove")}
              onPress={() => mutation.mutate({ type: "remove", key })}
              disabled={mutation.isPending}
              variant="ghost"
              icon={<Text style={style.removeText}>×</Text>}
            />
          </View>
          {blocking ? <Text style={style.blockedHint}>{translate("cartLineBlocked")}</Text> : null}
        </View>;
      })}
    </View>)}
    <View style={[style.summary, { backgroundColor: theme.colors.surface }]}>
      <View style={style.summaryRow}><Text style={style.summaryLabel}>{translate("cartSubtotal")}</Text><Text style={style.total}>{offers.isPending || offers.isError ? "—" : formatDZD(evaluation.subtotal)}</Text></View>
      <Text style={style.note}>{translate("cartDeliveryNote")}</Text>
      <Button
        label={translate("cartCheckout")}
        onPress={() => router.push("/checkout")}
        disabled={offers.isPending || offers.isError || evaluation.blockingCount > 0}
        fullWidth
      />
    </View>
  </CustomerScreen>;
}

const styles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  group: { borderRadius: 18, padding: 13, gap: 12 },
  store: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900", textAlign: "right" },
  line: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, gap: 8 },
  lineMain: { flexDirection: "row-reverse", gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: 13, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageMark: { color: theme.colors.accentMuted, fontSize: 28 },
  details: { flex: 1, alignItems: "flex-end", gap: 4 },
  name: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  options: { color: theme.colors.muted, fontSize: 11, textAlign: "right" },
  issue: { color: theme.colors.warning, fontSize: 11, fontWeight: "700", textAlign: "right" },
  priceIssue: { color: theme.colors.warning },
  price: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  controls: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  removeText: { color: theme.colors.danger, fontSize: 22, fontWeight: "800" },
  blockedHint: { color: theme.colors.danger, fontSize: 11, textAlign: "right" },
  warning: { backgroundColor: theme.colors.dangerSurface, borderRadius: 13, padding: 12 },
  warningText: { color: theme.colors.danger, fontSize: 12, fontWeight: "800", textAlign: "right" },
  summary: { borderRadius: 18, padding: 15, gap: 12 },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: theme.colors.muted, fontSize: 13, fontWeight: "700" },
  total: { color: theme.colors.accentMuted, fontSize: 19, fontWeight: "900" },
  note: { color: theme.colors.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
});
