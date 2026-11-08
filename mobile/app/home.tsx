import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppHeader, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import {
  CustomerScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
  StoreTile
} from "@/components/customer-ui";
import { fetchFeaturedStores } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

const categories = [
  { id: "fashion", icon: "shirt", label: "categoryFashion" },
  { id: "electronics", icon: "smartphone", label: "categoryElectronics" },
  { id: "beauty", icon: "sparkles", label: "categoryBeauty" },
  { id: "home", icon: "house", label: "categoryHome" },
  { id: "kids", icon: "baby", label: "categoryKids" },
  { id: "food", icon: "cake-slice", label: "categoryFood" }
] as const;

export default function CustomerHomeScreen() {
  const theme = useAppTheme();
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });

  return (
    <CustomerScreen>
      <AppHeader
        title="arownd"
        leading={
          <View
            accessibilityRole="button"
            accessibilityLabel={translate("notificationsTitle")}
            accessibilityState={{ disabled: true }}
            style={[
              styles.notificationButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}
          >
            <Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />
          </View>
        }
        trailing={
          <PressableSurface
            accessibilityLabel={translate("homeLocation")}
            onPress={() => router.push("/stores")}
            style={[styles.location, { backgroundColor: theme.colors.accent }]}
          >
            <UiText style={[styles.locationText, { color: theme.colors.accentForeground }]}>{translate("homeLocation")}</UiText>
            <Icon name="map-pin" size={17} color={theme.colors.accentForeground} />
          </PressableSurface>
        }
      />

      <View>
        <SectionTitle title={translate("homeCategories")} action={translate("homeSeeAll")} onAction={() => router.push("/explore")} />
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <PressableSurface
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={translate(category.label)}
              onPress={() => router.push({ pathname: "/explore", params: { category: category.id } })}
              style={[
                styles.category,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
            >
              <Icon name={category.icon} size={27} color={theme.colors.accentMuted} accessibilityHidden />
              <UiText style={[styles.categoryLabel, { color: theme.colors.foreground }]}>{translate(category.label)}</UiText>
            </PressableSurface>
          ))}
        </View>
      </View>

      <View>
        <SectionTitle title={translate("homeFeaturedStores")} action={translate("homeSeeAll")} onAction={() => router.push("/stores")} />
        {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void stores.refetch()} />
        ) : stores.data.length === 0 ? (
          <EmptyState title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
        ) : (
          <View style={styles.storeList}>
            {stores.data.map((store) => (
              <StoreTile key={store.id} name={store.name} description={store.description} logoUrl={store.logo_url} commune={store.commune} rating={store.rating} onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } })} />
            ))}
          </View>
        )}
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    width: designTokens.dimensions.controlHeight.md,
    height: designTokens.dimensions.controlHeight.md,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  location: { flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.xs, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, minHeight: designTokens.dimensions.controlHeight.sm },
  locationText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  categoryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", rowGap: designTokens.spacing.sm },
  category: { width: "31.5%", minHeight: 104, borderWidth: 1, borderRadius: designTokens.radius.lg, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, padding: designTokens.spacing.sm },
  categoryLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  storeList: { gap: designTokens.spacing.sm }
});
