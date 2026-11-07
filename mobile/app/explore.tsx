import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, CustomerSearch, EmptyState, ErrorState, LoadingState, ProductTile } from "@/components/customer-ui";
import { fetchHomeProducts, formatDZD, getPrimaryImage, searchCatalogProducts } from "@/lib/catalog";
import { translate } from "@/lib/i18n";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  useEffect(() => setQuery(params.q ?? ""), [params.q]);
  const normalized = query.trim();
  const products = useQuery({
    queryKey: ["customer-explore-products", normalized],
    queryFn: () => normalized ? searchCatalogProducts(normalized) : fetchHomeProducts(),
    staleTime: 30_000
  });

  return (
    <CustomerScreen>
      <Text onPress={() => router.back()} style={styles.back}>{translate("back")}</Text>
      <CustomerHeading title={translate("exploreTitle")} subtitle={translate("exploreSubtitle")} />
      <CustomerSearch value={query} onChangeText={setQuery} placeholder={translate("homeSearchPlaceholder")} />
      {products.isPending ? <LoadingState label={translate("stateLoading")} /> : products.isError ? (
        <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void products.refetch()} />
      ) : products.data.length === 0 ? (
        <EmptyState title={translate("exploreNoResults")} hint={translate("exploreNoResultsHint")} />
      ) : (
        <View style={styles.grid}>
          {products.data.map((item) => (
            <ProductTile key={item.id} name={item.product.name} store={item.store.name} price={formatDZD(item.price)} imageUrl={getPrimaryImage(item)} />
          ))}
        </View>
      )}
      <Text style={styles.footer}>{translate("exploreFooter")}</Text>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: "#647D13", fontWeight: "800", fontSize: 13, minHeight: 38, textAlignVertical: "center" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  footer: { color: "#737373", fontSize: 11, textAlign: "center", padding: 14 }
});
