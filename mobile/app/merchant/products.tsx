import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import {
  fetchMerchantAccess
} from "@/lib/merchant";
import {
  fetchMerchantProducts,
  setMerchantProductVisibility,
  updateMerchantProductOffer
} from "@/lib/merchant-products";
import {
  filterMerchantProducts,
  getMerchantInventoryLevel,
  getMerchantInventorySummary,
  validateMerchantOfferValues,
  type MerchantInventoryFilter,
  type MerchantProductOffer
} from "@/lib/merchant-products-state";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantProductsScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MerchantInventoryFilter>("all");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && !!storeId;

  const products = useQuery({
    queryKey: ["merchant-products", storeId],
    queryFn: () => fetchMerchantProducts(storeId ?? ""),
    enabled: ready,
    retry: false
  });

  const saveOffer = async (
    offer: MerchantProductOffer,
    priceInput: string,
    stockInput: string
  ): Promise<void> => {
    if (!storeId || busyOfferId) return;

    const values = validateMerchantOfferValues(priceInput, stockInput);
    if (!values) {
      setNotice(null);
      setActionError(translate("merchantProductsValidation"));
      return;
    }

    setBusyOfferId(offer.id);
    setNotice(null);
    setActionError(null);

    try {
      await updateMerchantProductOffer(offer.id, storeId, values);
      await queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] });
      setNotice(translate("merchantProductsSaved"));
    } catch {
      setActionError(translate("merchantProductsSaveError"));
    } finally {
      setBusyOfferId(null);
    }
  };

  const toggleVisibility = async (offer: MerchantProductOffer): Promise<void> => {
    if (!storeId || busyOfferId) return;

    setBusyOfferId(offer.id);
    setNotice(null);
    setActionError(null);

    try {
      await setMerchantProductVisibility(offer.id, storeId, offer.is_merchant_hidden);
      await queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] });
      setNotice(translate("merchantProductsSaved"));
    } catch {
      setActionError(translate("merchantProductsVisibilityError"));
    } finally {
      setBusyOfferId(null);
    }
  };

  if (access.isPending) {
    return <MessageScreen theme={theme} loading label={translate("merchantLoading")} />;
  }

  if (access.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void access.refetch()}
      />
    );
  }

  if (!access.data) return <Redirect href="/login" />;
  if (!ready) return <Redirect href="/merchant" />;

  if (products.isPending) {
    return <MessageScreen theme={theme} loading label={translate("merchantProductsLoading")} />;
  }

  if (products.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantProductsLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void products.refetch()}
      />
    );
  }

  const allOffers = products.data;
  const summary = getMerchantInventorySummary(allOffers);
  const visibleOffers = filterMerchantProducts(allOffers, search, filter);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.replace("/merchant")} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>
            {translate("merchantProductsBack")}
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>
            {translate("merchantDashboardEyebrow")}
          </Text>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {translate("merchantProductsTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {translate("merchantProductsSubtitle")}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/merchant/products/new")}
          style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.accentForeground }]}>
            {translate("merchantProductCreateOpen")}
          </Text>
        </Pressable>

        <View style={styles.summaryGrid}>
          <SummaryCard label={translate("merchantProductsSummaryTotal")} value={summary.total} theme={theme} />
          <SummaryCard label={translate("merchantProductsSummaryLow")} value={summary.low} theme={theme} tone="warning" />
          <SummaryCard label={translate("merchantProductsSummaryOut")} value={summary.out} theme={theme} tone="danger" />
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={translate("merchantProductsSearchPlaceholder")}
          placeholderTextColor={theme.colors.placeholder}
          accessibilityLabel={translate("merchantProductsSearchPlaceholder")}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        />

        <View style={styles.filters}>
          <FilterButton value="all" selected={filter === "all"} label={translate("merchantProductsFilterAll")} theme={theme} onPress={setFilter} />
          <FilterButton value="low" selected={filter === "low"} label={translate("merchantProductsFilterLow")} theme={theme} onPress={setFilter} />
          <FilterButton value="out" selected={filter === "out"} label={translate("merchantProductsFilterOut")} theme={theme} onPress={setFilter} />
        </View>

        {notice ? (
          <View style={[styles.feedback, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.successBorder }]}>
            <Text style={[styles.feedbackText, { color: theme.colors.success }]}>{notice}</Text>
          </View>
        ) : null}
        {actionError ? (
          <View style={[styles.feedback, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
            <Text style={[styles.feedbackText, { color: theme.colors.danger }]}>{actionError}</Text>
          </View>
        ) : null}

        {allOffers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsEmpty")}</Text>
            <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>{translate("merchantProductsEmptyHint")}</Text>
          </View>
        ) : visibleOffers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsNoResults")}</Text>
          </View>
        ) : (
          <View style={styles.offerList}>
            {visibleOffers.map((offer) => (
              <MerchantOfferCard
                key={offer.id}
                offer={offer}
                theme={theme}
                busy={busyOfferId === offer.id}
                anyBusy={busyOfferId !== null}
                onSave={(price, stock) => void saveOffer(offer, price, stock)}
                onToggleVisibility={() => void toggleVisibility(offer)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MerchantOfferCard({
  offer,
  theme,
  busy,
  anyBusy,
  onSave,
  onToggleVisibility
}: {
  offer: MerchantProductOffer;
  theme: AppTheme;
  busy: boolean;
  anyBusy: boolean;
  onSave: (price: string, stock: string) => void;
  onToggleVisibility: () => void;
}) {
  const styles = createStyles(theme);
  const [price, setPrice] = useState(String(offer.price));
  const [stock, setStock] = useState(String(offer.stock_quantity));

  useEffect(() => {
    setPrice(String(offer.price));
    setStock(String(offer.stock_quantity));
  }, [offer.price, offer.stock_quantity]);

  const image = offer.images.find((item) => item.is_primary) ?? offer.images[0] ?? null;
  const inventoryLevel = getMerchantInventoryLevel(offer.stock_quantity);
  const inventoryLabel = inventoryLevel === "out"
    ? translate("merchantProductsOut")
    : inventoryLevel === "low"
      ? translate("merchantProductsLow")
      : translate("merchantProductsAvailable");
  const inventoryTone = inventoryLevel === "out"
    ? theme.colors.danger
    : inventoryLevel === "low"
      ? theme.colors.warning
      : theme.colors.success;
  const inventorySurface = inventoryLevel === "out"
    ? theme.colors.dangerSurface
    : inventoryLevel === "low"
      ? theme.colors.warningSurface
      : theme.colors.successSurface;

  return (
    <View style={[styles.offerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.productHeader}>
        <View style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}>
          {image ? (
            <Image source={{ uri: image.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={[styles.imageFallback, { color: theme.colors.muted }]}>A</Text>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.foreground }]} numberOfLines={2}>
            {offer.product.name}
          </Text>
          {offer.product.brand ? (
            <Text style={[styles.productBrand, { color: theme.colors.muted }]} numberOfLines={1}>
              {offer.product.brand}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={[styles.statusPill, { backgroundColor: inventorySurface }]}>
              <Text style={[styles.statusText, { color: inventoryTone }]}>{inventoryLabel}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.statusText, { color: theme.colors.muted }]}>
                {offer.is_merchant_hidden
                  ? translate("merchantProductsHidden")
                  : translate("merchantProductsVisible")}
              </Text>
            </View>
          </View>
          <Text style={[styles.currentPrice, { color: theme.colors.accentMuted }]}>{formatDZD(offer.price)}</Text>
        </View>
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsPriceLabel")}</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            editable={!anyBusy}
            accessibilityLabel={translate("merchantProductsPriceLabel")}
            style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsStockLabel")}</Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            editable={!anyBusy}
            accessibilityLabel={translate("merchantProductsStockLabel")}
            style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          />
          <Text style={[styles.stockHint, { color: theme.colors.subtle }]}>
            {translate("merchantProductsStockHint")}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={anyBusy}
          onPress={() => onSave(price, stock)}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, opacity: anyBusy ? 0.55 : 1 }]}
        >
          {busy ? <ActivityIndicator color={theme.colors.accentForeground} /> : (
            <Text style={[styles.saveButtonText, { color: theme.colors.accentForeground }]}>
              {translate("merchantProductsSave")}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={anyBusy}
          onPress={onToggleVisibility}
          style={[styles.visibilityButton, { borderColor: theme.colors.border, opacity: anyBusy ? 0.55 : 1 }]}
        >
          <Text style={[styles.visibilityButtonText, { color: theme.colors.foreground }]}>
            {offer.is_merchant_hidden
              ? translate("merchantProductsShow")
              : translate("merchantProductsHide")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  theme,
  tone = "normal"
}: {
  label: string;
  value: number;
  theme: AppTheme;
  tone?: "normal" | "warning" | "danger";
}) {
  const styles = createStyles(theme);
  const color = tone === "warning"
    ? theme.colors.warning
    : tone === "danger"
      ? theme.colors.danger
      : theme.colors.foreground;

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.summaryLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{String(value)}</Text>
    </View>
  );
}

function FilterButton({
  value,
  selected,
  label,
  theme,
  onPress
}: {
  value: MerchantInventoryFilter;
  selected: boolean;
  label: string;
  theme: AppTheme;
  onPress: (filter: MerchantInventoryFilter) => void;
}) {
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(value)}
      style={[
        styles.filterButton,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border
        }
      ]}
    >
      <Text style={[styles.filterLabel, { color: selected ? theme.colors.accentForeground : theme.colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageScreen({
  theme,
  title,
  label,
  actionLabel,
  onAction,
  loading = false
}: {
  theme: AppTheme;
  title?: string;
  label?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.messageContainer}>
        {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
        <Text style={[styles.messageText, { color: theme.colors.foreground }]}>{title ?? label ?? ""}</Text>
        {onAction && actionLabel ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.retryText, { color: theme.colors.accentForeground }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 16, paddingBottom: 36, gap: 15 },
    backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 3 },
    backText: { fontSize: 12, fontWeight: "800" },
    header: { alignItems: "flex-end", gap: 6 },
    eyebrow: { fontSize: 10, fontWeight: "900" },
    title: { width: "100%", fontSize: 25, lineHeight: 33, fontWeight: "900", textAlign: "right" },
    subtitle: { width: "100%", fontSize: 12, lineHeight: 20, textAlign: "right" },
    addButton: { minHeight: 47, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    addButtonText: { fontSize: 12, fontWeight: "900" },
    summaryGrid: { flexDirection: "row-reverse", gap: 8 },
    summaryCard: { flex: 1, minHeight: 75, borderWidth: 1, borderRadius: 15, padding: 11, gap: 5, alignItems: "flex-end" },
    summaryLabel: { fontSize: 10, fontWeight: "800", textAlign: "right" },
    summaryValue: { fontSize: 22, fontWeight: "900" },
    searchInput: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, textAlign: "right", fontSize: 13 },
    filters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
    filterButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, justifyContent: "center", alignItems: "center" },
    filterLabel: { fontSize: 11, fontWeight: "900" },
    feedback: { borderWidth: 1, borderRadius: 13, padding: 11 },
    feedbackText: { fontSize: 11, lineHeight: 18, fontWeight: "800", textAlign: "right" },
    emptyCard: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 7, alignItems: "flex-end" },
    emptyTitle: { fontSize: 14, fontWeight: "900", textAlign: "right" },
    emptyHint: { fontSize: 11, lineHeight: 18, textAlign: "right" },
    offerList: { gap: 12 },
    offerCard: { borderWidth: 1, borderRadius: 18, padding: 13, gap: 13 },
    productHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 11 },
    productImage: { width: 76, height: 76, borderRadius: 15, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    image: { width: "100%", height: "100%" },
    imageFallback: { fontSize: 24, fontWeight: "900" },
    productInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
    productName: { width: "100%", fontSize: 13, lineHeight: 19, fontWeight: "900", textAlign: "right" },
    productBrand: { width: "100%", fontSize: 10, textAlign: "right" },
    badgeRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginTop: 2 },
    statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 9, fontWeight: "900" },
    currentPrice: { fontSize: 12, fontWeight: "900", marginTop: 1 },
    inputsRow: { flexDirection: "row-reverse", gap: 9 },
    inputGroup: { flex: 1, gap: 5 },
    inputLabel: { fontSize: 10, fontWeight: "800", textAlign: "right" },
    stockHint: { fontSize: 9, lineHeight: 14, textAlign: "right" },
    valueInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, textAlign: "right", fontSize: 14, fontWeight: "800" },
    actionsRow: { flexDirection: "row-reverse", gap: 8 },
    saveButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    saveButtonText: { fontSize: 12, fontWeight: "900" },
    visibilityButton: { minWidth: 104, minHeight: 46, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    visibilityButtonText: { fontSize: 11, fontWeight: "900" },
    messageContainer: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 15 },
    messageText: { fontSize: 13, lineHeight: 21, fontWeight: "800", textAlign: "center" },
    retryButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 20, justifyContent: "center", alignItems: "center" },
    retryText: { fontSize: 12, fontWeight: "900" }
  });
}
