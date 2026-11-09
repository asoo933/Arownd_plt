import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CustomerScreen, CustomerSearch, EmptyState, ErrorState, LoadingState, ProductTile, SectionTitle } from "@/components/customer-ui";
import { fetchHomeProducts, formatDZD, getPrimaryImage, searchCatalogProducts } from "@/lib/catalog";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { Icon, IconButton, PressableSurface, Text as UiText } from "@/components/ui";

const categories = [
  { id: "fashion", icon: "shirt", label: "categoryFashion" },
  { id: "electronics", icon: "smartphone", label: "categoryElectronics" },
  { id: "beauty", icon: "sparkles", label: "categoryBeauty" },
  { id: "home", icon: "house", label: "categoryHome" },
  { id: "kids", icon: "baby", label: "categoryKids" },
  { id: "food", icon: "cake-slice", label: "categoryFood" }
] as const;

export default function ExploreScreen() {
  useLanguage();
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
      <View style={styles.header}>
        <View style={styles.search}>
          <CustomerSearch value={query} onChangeText={setQuery} placeholder={translate("homeSearchPlaceholder")} />
        </View>
        <IconButton
          accessibilityLabel={translate("notificationsTitle")}
          onPress={() => router.push("/notifications")}
          icon={<Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />}
        />
      </View>
      <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("exploreSubtitle")}</UiText>

      <View>
        <SectionTitle title={translate("homeCategories")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
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
        </ScrollView>
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
  header: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  search: { flex: 1 },
  subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "auto" },
  categoryRail: { flexDirection: "row", gap: designTokens.spacing.sm },
  category: { width: 112, minHeight: 88, borderWidth: 1, borderRadius: designTokens.radius.lg, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, padding: designTokens.spacing.sm },
  categoryLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: designTokens.spacing.md },
  footer: { fontSize: designTokens.typography.caption, textAlign: "center", padding: designTokens.spacing.lg }
});
