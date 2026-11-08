import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, CustomerSearch, EmptyState, ErrorState, LoadingState, ProductTile, SectionTitle } from "@/components/customer-ui";
import { fetchHomeProducts, formatDZD, getPrimaryImage, searchCatalogProducts } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { AppHeader, Icon, IconButton, PressableSurface, Text as UiText } from "@/components/ui";

const categories = [
  { id: "fashion", icon: "shirt", label: "categoryFashion" },
  { id: "electronics", icon: "smartphone", label: "categoryElectronics" },
  { id: "beauty", icon: "sparkles", label: "categoryBeauty" },
  { id: "home", icon: "house", label: "categoryHome" },
  { id: "kids", icon: "baby", label: "categoryKids" },
  { id: "food", icon: "cake-slice", label: "categoryFood" }
] as const;

export default function ExploreScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : undefined;
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const hasActiveFilter = Boolean(debouncedQuery || category);

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
    staleTime: 30_000,
    enabled: hasActiveFilter
  });

  return (
    <CustomerScreen>
      <AppHeader
        title={translate("exploreTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />}
      />
      <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("exploreSubtitle")}</UiText>
      <CustomerSearch value={query} onChangeText={setQuery} placeholder={translate("homeSearchPlaceholder")} />

      <View>
        <SectionTitle title={translate("homeCategories")} />
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const selected = category === item.id;
            return (
              <PressableSurface
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={translate(item.label)}
                accessibilityState={{ selected }}
                onPress={() => router.setParams({ category: selected ? undefined : item.id })}
                style={[
                  styles.category,
                  {
                    backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                    borderColor: selected ? theme.colors.accent : theme.colors.border
                  }
                ]}
              >
                <Icon name={item.icon} size={27} color={selected ? theme.colors.accentForeground : theme.colors.accentMuted} accessibilityHidden />
                <UiText style={[styles.categoryLabel, { color: selected ? theme.colors.accentForeground : theme.colors.foreground }]}>{translate(item.label)}</UiText>
              </PressableSurface>
            );
          })}
        </View>
      </View>

      {hasActiveFilter ? (
        products.isPending ? <LoadingState label={translate("stateLoading")} /> : products.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void products.refetch()} />
        ) : products.data.length === 0 ? (
          <EmptyState title={translate("exploreNoResults")} hint={translate("exploreNoResultsHint")} />
        ) : (
          <View style={styles.grid}>
            {products.data.map((item) => (
              <ProductTile key={item.id} name={item.product.name} store={item.store.name} price={formatDZD(item.price)} imageUrl={getPrimaryImage(item)} onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } })} style={{ width: "48%" }} />
            ))}
          </View>
        )
      ) : null}

      {hasActiveFilter ? (
        <UiText style={[styles.footer, { color: theme.colors.muted }]}>{translate("exploreFooter")}</UiText>
      ) : null}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "right" },
  categoryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", rowGap: designTokens.spacing.sm },
  category: { width: "31.5%", minHeight: 104, borderWidth: 1, borderRadius: designTokens.radius.lg, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, padding: designTokens.spacing.sm },
  categoryLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: designTokens.spacing.md },
  footer: { fontSize: designTokens.typography.caption, textAlign: "center", padding: designTokens.spacing.lg }
});
