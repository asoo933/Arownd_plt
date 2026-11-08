import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState, StoreTile } from "@/components/customer-ui";
import { fetchFeaturedStores } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";
import { IconButton } from "@/components/ui";

export default function StoresScreen() {
  const theme = useAppTheme();
  const stores = useQuery({ queryKey: ["customer-stores"], queryFn: fetchFeaturedStores, staleTime: 60_000 });
  return (
    <CustomerScreen>
      <IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />
      <CustomerHeading title={translate("storesTitle")} subtitle={translate("storesSubtitle")} />
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
