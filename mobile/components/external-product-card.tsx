import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";

import { Button, Caption, Icon, Image as UiImage, Text as UiText } from "@/components/ui";
import { EmptyState, SectionTitle } from "@/components/customer-ui";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export type ExternalProduct = {
  id: string;
  name: string;
  storeName: string;
  productUrl: string;
  imageUrl?: string | null;
  priceLabel?: string | null;
};

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function ExternalProductCard({ product }: { product: ExternalProduct }) {
  const theme = useAppTheme();
  const canOpen = isSafeExternalUrl(product.productUrl);

  const openProduct = async () => {
    if (!canOpen) {
      Alert.alert(translate("externalProductOpenError"));
      return;
    }

    try {
      await Linking.openURL(product.productUrl);
    } catch {
      Alert.alert(translate("externalProductOpenError"));
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: theme.mode === "light" ? 0 : 1
        }
      ]}
    >
      <View style={[styles.imageFrame, { backgroundColor: theme.colors.surfaceMuted }]}>
        {product.imageUrl ? (
          <UiImage uri={product.imageUrl} accessibilityLabel={product.name} aspectRatio={1} style={StyleSheet.absoluteFill} />
        ) : (
          <Icon name="image" size={32} color={theme.colors.subtle} accessibilityHidden />
        )}
      </View>
      <View style={styles.cardContent}>
        <Caption numberOfLines={1}>{product.storeName}</Caption>
        <UiText weight="700" numberOfLines={2} style={styles.productName}>{product.name}</UiText>
        {product.priceLabel ? <UiText weight="800" style={styles.price}>{product.priceLabel}</UiText> : null}
        <Button
          label={translate("externalProductBuyNow")}
          onPress={() => void openProduct()}
          disabled={!canOpen}
          size="sm"
          fullWidth
          endIcon={<Icon name="external-link" size={15} color={theme.colors.onAccent} accessibilityHidden />}
        />
      </View>
    </View>
  );
}

export function ExternalProductsSection({ products }: { products: ExternalProduct[] }) {
  return (
    <View>
      <SectionTitle title={translate("homeExternalProducts")} subtitle={translate("homeExternalProductsSubtitle")} />
      {products.length === 0 ? (
        <EmptyState
          icon="globe"
          title={translate("homeExternalProductsEmpty")}
          hint={translate("homeExternalProductsEmptyHint")}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {products.map((product) => <ExternalProductCard key={product.id} product={product} />)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "row",
    gap: designTokens.spacing.md
  },
  card: {
    width: 176,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.sm,
    gap: designTokens.spacing.sm
  },
  imageFrame: {
    height: 148,
    borderRadius: designTokens.radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  cardContent: {
    gap: designTokens.spacing.xs,
    alignItems: "stretch"
  },
  productName: {
    minHeight: 40,
    textAlign: "auto"
  },
  price: {
    textAlign: "auto",
    marginTop: designTokens.spacing.xs
  }
});
