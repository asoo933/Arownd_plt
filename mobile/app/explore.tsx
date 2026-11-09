import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState, ProductTile, SectionTitle } from "@/components/customer-ui";
import { fetchHomeProducts, formatDZD, getPrimaryImage, searchCatalogProducts } from "@/lib/catalog";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { Icon, IconButton, PressableSurface, SearchField, Text as UiText } from "@/components/ui";

const categories = [
  { id: "fashion", icon: "shirt", label: "categoryFashion" },
  { id: "electronics", icon: "smartphone", label: "categoryElectronics" },
  { id: "beauty", icon: "sparkles", label: "categoryBeauty" },
  { id: "home", icon: "house", label: "categoryHome" },
  { id: "kids", icon: "baby", label: "categoryKids" },
  { id: "food", icon: "cake-slice", label: "categoryFood" }
] as const;

export default function ExploreScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : undefined;
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [railWidth, setRailWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveFilter = Boolean(debouncedQuery || category);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (viewportWidth <= 0 || railWidth <= viewportWidth) return;

    const startOffset = language === "ar" ? -(railWidth - viewportWidth) : 0;
    translateX.setValue(startOffset);

    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: startOffset - railWidth,
        duration: Math.max(28_000, Math.round(railWidth * 45)),
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    animationRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [language, railWidth, translateX, viewportWidth]);

  const normalized = debouncedQuery;
  const products = useQuery({
    queryKey: ["customer-explore-products", normalized, category],
    queryFn: () => normalized || category
      ? searchCatalogProducts(normalized, category)
      : fetchHomeProducts(),
    staleTime: 30_000,
    enabled: hasActiveFilter
  });

  const orderedCategories = language === "ar" ? [...categories].reverse() : categories;

  const renderCategory = (item: (typeof categories)[number]) => {
    const selected = category === item.id;

    return (
      <PressableSurface
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={translate(item.label)}
        accessibilityState={{ selected }}
        onPress={() => {
          animationRef.current?.stop();
          if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = setTimeout(() => animationRef.current?.start(), 900);
          router.setParams({ category: selected ? undefined : item.id });
        }}
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
  };

  return (
    <CustomerScreen>
      <View style={styles.topSection}>
        <View style={styles.header}>
          <View style={styles.search}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={translate("homeSearchPlaceholder")}
              accessibilityLabel={translate("homeSearchPlaceholder")}
              style={{
                backgroundColor: "transparent",
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill
              }}
            />
          </View>
          <IconButton
            accessibilityLabel={translate("notificationsTitle")}
            onPress={() => router.push("/notifications")}
            icon={<Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />}
          />
        </View>
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("exploreSubtitle")}</UiText>
      </View>

      <View>
        <SectionTitle title={translate("homeCategories")} />
        <View
          style={styles.categoryViewport}
          onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.categoryTrack,
              { transform: [{ translateX }] }
            ]}
          >
            <View style={styles.categoryGroup} onLayout={(event) => setRailWidth(event.nativeEvent.layout.width)}>
              {orderedCategories.map(renderCategory)}
            </View>
            <View
              style={styles.categoryGroup}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {orderedCategories.map(renderCategory)}
            </View>
          </Animated.View>
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
  topSection: { gap: designTokens.spacing.xs },
  header: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
  search: { flex: 1 },
  subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "auto" },
  categoryViewport: { overflow: "hidden" },
  categoryTrack: { flexDirection: "row", alignItems: "center", direction: "ltr" },
  categoryGroup: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm, paddingRight: designTokens.spacing.sm, flexShrink: 0, direction: "ltr" },
  category: { width: 112, minHeight: 88, borderWidth: 1, borderRadius: designTokens.radius.lg, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, padding: designTokens.spacing.sm },
  categoryLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: designTokens.spacing.md },
  footer: { fontSize: designTokens.typography.caption, textAlign: "center", padding: designTokens.spacing.lg }
});
