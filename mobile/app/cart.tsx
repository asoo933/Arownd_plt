import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  Alert,
  AppHeader,
  Button,
  Card,
  CartItem,
  CartSummary,
  Caption,
  Icon,
  IconButton,
  Image as UiImage,
  PressableSurface,
  PriceText,
  QuantityStepper,
  Text as UiText
} from "@/components/ui";
import { fetchOffersByIds, formatDZD, formatNumber, getPrimaryImage } from "@/lib/catalog";
import { CART_QUERY_KEY, getCart, removeFromCart, updateCartQuantity } from "@/lib/cart";
import { cartLineKey, evaluateCart, normalizeCartOptions, type CartItem as CartLine } from "@/lib/cart-state";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function CartScreen() {
  useLanguage();
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
    <AppHeader title={translate("cartTitle")} />
    <Card contentStyle={style.emptyContent}>
      <View style={style.emptyIcon}>
        <Icon name="shopping-cart" size={30} color={theme.colors.accentMuted} accessibilityHidden />
      </View>
      <UiText weight="800" style={style.emptyTitle}>{translate("cartEmpty")}</UiText>
      <Caption style={style.emptyHint}>{translate("cartEmptyHint")}</Caption>
    </Card>
    <Button label={translate("cartBrowse")} onPress={() => router.push("/explore")} fullWidth />
  </CustomerScreen>;

  const evaluation = evaluateCart(cart.data, offers.data);
  const offerById = new Map((offers.data ?? []).map((offer) => [offer.id, offer]));
  const groups = new Map<string, { storeName: string; items: CartLine[] }>();
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

  return <CustomerScreen
    footer={
      <CartSummary style={style.summaryContent}>
        <View style={style.summaryRow}>
          <UiText tone="muted" style={style.summaryLabel}>{translate("cartSubtotal")}</UiText>
          <PriceText numberOfLines={1} adjustsFontSizeToFit value={offers.isPending || offers.isError ? "—" : formatDZD(evaluation.subtotal)} tone="accentMuted" style={style.total} />
        </View>
        <Caption style={style.note}>{translate("cartDeliveryNote")}</Caption>
        <Button
          label={translate("cartCheckout")}
          onPress={() => router.push("/checkout")}
          disabled={offers.isPending || offers.isError || mutation.isPending || evaluation.blockingCount > 0}
          fullWidth
        />
      </CartSummary>
    }
  >
    <AppHeader
      title={translate("cartTitle")}
      trailing={<Caption style={style.itemCount}>{translate("cartItemsCount") + formatNumber(cart.data.reduce((sum, item) => sum + item.quantity, 0))}</Caption>}
    />
    {offers.isError ? <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} /> : null}
    {offers.isPending ? <LoadingState label={translate("cartVerifying")} /> : null}
    {mutation.isError ? <Alert tone="danger" description={translate("genericError")} /> : null}
    {evaluation.blockingCount > 0 ? <Alert tone="danger" description={translate("cartBlocked") + evaluation.blockingCount} /> : null}
    {[...groups.entries()].map(([storeId, group]) => <Card key={storeId} style={style.group} contentStyle={style.groupContent}>
      <UiText tone="accentMuted" weight="900" style={style.store}>{group.storeName}</UiText>
      {group.items.map((item, itemIndex) => {
        const key = cartLineKey(item);
        const offer = offerById.get(item.offerId);
        const line = evaluation.lines.find((entry) => cartLineKey(entry.item) === key);
        const image = offer ? getPrimaryImage(offer) : null;
        const currentPrice = offer?.price ?? item.price ?? 0;
        const blocking = (line?.issues.length ?? 0) > 0;
        const totalRequestedForOffer = cart.data.filter((entry) => entry.offerId === item.offerId).reduce((sum, entry) => sum + entry.quantity, 0);
        return <CartItem key={key} style={[style.line, itemIndex === group.items.length - 1 && style.lastLine]}>
          <View style={style.itemContent}>
            <PressableSurface
              accessibilityLabel={offer?.product.name ?? item.name}
              disabled={!item.productId}
              onPress={() => { if (item.productId) router.push({ pathname: "/product/[productId]", params: { productId: item.productId } }); }}
              style={style.lineMain}
            >
              <View style={style.thumb}>{image ? <UiImage uri={image} accessibilityLabel={offer?.product.name ?? item.name ?? ""} style={StyleSheet.absoluteFill} /> : <Icon name="image" size={28} color={theme.colors.subtle} accessibilityHidden />}</View>
              <View style={style.details}>
                <UiText numberOfLines={2} weight="800" style={style.name}>{offer?.product.name ?? item.name}</UiText>
                {Object.keys(normalizeCartOptions(item.options)).length > 0 ? <Caption style={style.options}>{Object.entries(normalizeCartOptions(item.options)).map(([optionName, value]) => (optionName === "size" ? translate("productSizeOption") : optionName === "color" ? translate("productColorOption") : optionName) + ": " + value).join(" · ")}</Caption> : null}
                {line?.issues.map((issue) => <Caption key={issue} tone={issue === "priceChanged" ? "warning" : "danger"} weight="700" style={style.issue}>{issueLabels[issue]}</Caption>)}
                <PriceText
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  value={formatDZD(currentPrice * item.quantity)}
                  previousValue={line?.issues.includes("priceChanged") && item.price != null ? formatDZD(item.price * item.quantity) : undefined}
                  tone="accentMuted"
                  style={style.price}
                />
                {item.quantity > 1 ? <Caption numberOfLines={1} style={style.options}>{formatDZD(currentPrice)} × {item.quantity}</Caption> : null}
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
                icon={<Icon name="trash-2" size={19} color={theme.colors.danger} accessibilityHidden />}
              />
            </View>
            {blocking ? <Caption tone="danger" style={style.blockedHint}>{translate("cartLineBlocked")}</Caption> : null}
          </View>
        </CartItem>;
      })}
    </Card>)}
  </CustomerScreen>;
}

const styles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  group: { backgroundColor: theme.colors.surface },
  groupContent: { padding: designTokens.spacing.md, gap: designTokens.spacing.md },
  emptyContent: { minHeight: 220, alignItems: "center", justifyContent: "center", padding: designTokens.spacing.xl, gap: designTokens.spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: designTokens.radius.pill, backgroundColor: theme.colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: designTokens.typography.subtitle, textAlign: "center" },
  emptyHint: { textAlign: "center", lineHeight: 20 },
  itemCount: { fontSize: designTokens.typography.caption + 1 },
  store: { fontSize: designTokens.typography.body - 1, textAlign: "auto" },
  line: { paddingVertical: 0 },
  lastLine: { borderBottomWidth: 0 },
  itemContent: { flex: 1, gap: designTokens.spacing.sm },
  lineMain: { flex: 1, flexDirection: "row", gap: designTokens.spacing.md },
  thumb: { width: 76, height: 76, borderRadius: designTokens.radius.md, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  details: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  name: { fontSize: designTokens.typography.body - 1, textAlign: "auto" },
  options: { fontSize: designTokens.typography.caption, textAlign: "auto" },
  issue: { textAlign: "auto" },
  price: { fontSize: designTokens.typography.body - 1 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
  blockedHint: { textAlign: "auto" },
  summaryContent: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { flex: 1, fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.bold },
  total: { flexShrink: 0, fontSize: designTokens.typography.title - 3 },
  note: { fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" }
});
