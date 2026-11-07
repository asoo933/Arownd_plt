import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, CustomerSearch, EmptyState, ErrorState, LoadingState, ProductTile } from "@/components/customer-ui";
import { fetchHomeProducts, formatDZD, getPrimaryImage, searchCatalogProducts } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export default function ExploreScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : undefined;
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const normalized = debouncedQuery;
  const products = useQuery({
    queryKey: ["customer-explore-products", normalized, category],
    queryFn: () => normalized || category
      ? searchCatalogProducts(normalized, category)
      : fetchHomeProducts(),
    staleTime: 30_000
  });

  return (
    <CustomerScreen>
      <Pressable accessibilityRole="button" accessibilityLabel={translate("back")} onPress={() => router.back()} style={styles.back}><Text style={{ color: theme.colors.accentMuted, fontWeight: "800", fontSize: 13 }}>{translate("back")}</Text></Pressable>
      <CustomerHeading title={translate("exploreTitle")} subtitle={translate("exploreSubtitle")} />
      <CustomerSearch value={query} onChangeText={setQuery} placeholder={translate("homeSearchPlaceholder")} />
      {products.isPending ? <LoadingState label={translate("stateLoading")} /> : products.isError ? (
        <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState title={translate("exploreNoResults")} hint={translate("exploreNoResultsHint")} />
      ) : (
        <View style={styles.grid}>
          {products.data.map((item) => (
            <ProductTile key={item.id} name={item.product.name} store={item.store.name} price={formatDZD(item.price)} oldPrice={item.old_price != null && item.old_price > item.price ? formatDZD(item.old_price) : null} imageUrl={getPrimaryImage(item)} onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } })} />
          ))}
        </View>
      )}
      <Text style={[styles.footer, { color: theme.colors.muted }]}>{translate("exploreFooter")}</Text>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 4 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  footer: { fontSize: 11, textAlign: "center", padding: 14 }
});
