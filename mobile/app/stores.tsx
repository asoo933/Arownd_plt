import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState, StoreTile } from "@/components/customer-ui";
import { fetchFeaturedStores } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";
import { AppHeader, Icon, IconButton, Text as UiText } from "@/components/ui";

export default function StoresScreen() {
  const theme = useAppTheme();
  const stores = useQuery({ queryKey: ["customer-stores"], queryFn: fetchFeaturedStores, staleTime: 60_000 });
  return (
    <CustomerScreen>
      <AppHeader title={translate("storesTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" color={theme.colors.foreground} size={20} />} />} />
      <UiText tone="muted" style={{ fontSize: 12 }}>{translate("storesSubtitle")}</UiText>
      {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
        <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void stores.refetch()} />
      ) : stores.data.length === 0 ? (
        <EmptyState title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
      ) : (
        <View style={styles.list}>
          {stores.data.map((store) => (
            <StoreTile key={store.id} name={store.name} description={store.description} logoUrl={store.logo_url} commune={store.commune} rating={store.rating} onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } })} />
          ))}
        </View>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 }
});
