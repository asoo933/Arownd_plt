import React from 'react';
import { View, Text, Image, Pressable, FlatList } from 'react-native';
import { useTheme } from '../theme';
import { Surface } from './foundation';

/** Small lime-to-error pill announcing a price cut. */
export function DiscountBadge({ percent }: { percent: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: 10,
        start: 10,
        backgroundColor: theme.colors.error,
        borderRadius: theme.radius.pill,
        paddingVertical: 2,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: theme.typography.weights.bold }}>−{percent}٪</Text>
    </View>
  );
}

/** Heart toggle, persisted per-product by the parent. */
export function FavoriteButton({ active, onToggle }: { active: boolean; onToggle: (next: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="المفضلة"
      onPress={() => onToggle(!active)}
      style={{
        position: 'absolute',
        top: 8,
        end: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: active ? theme.colors.error : theme.colors.text }}>{active ? '♥' : '♡'}</Text>
    </Pressable>
  );
}

/** Star rating with review count, read-only. */
export function Rating({ value, count }: { value: number; count?: number }) {
  const { theme } = useTheme();
  return (
    <Text style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary }}>
      <Text style={{ color: '#D8B84A' }}>★</Text> {value.toFixed(1)}
      {count != null ? ` (${count})` : ''}
    </Text>
  );
}

export type Product = {
  id: string;
  title: string;
  storeName: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  favorite?: boolean;
};

/** The core commerce card: image, discount, favorite, store line, price, add-to-cart. */
export function ProductCard({
  product,
  onPress,
  onToggleFavorite,
  onAddToCart,
}: {
  product: Product;
  onPress?: () => void;
  onToggleFavorite?: (next: boolean) => void;
  onAddToCart?: () => void;
}) {
  const { theme } = useTheme();
  const discount = product.compareAtPrice
    ? Math.round(100 - (product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <Pressable onPress={onPress} style={{ width: '100%' }}>
      <Surface style={{ gap: 6, padding: theme.spacing.sm }} radius="lg">
        <View style={{ height: 120, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : null}
          {discount > 0 && <DiscountBadge percent={discount} />}
          <FavoriteButton active={!!product.favorite} onToggle={(v) => onToggleFavorite?.(v)} />
        </View>
        <Text numberOfLines={1} style={{ fontWeight: theme.typography.weights.semibold, color: theme.colors.text, fontSize: theme.typography.sizes.base }}>
          {product.title}
        </Text>
        <Text style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary }}>
          {product.storeName}
          {product.rating != null ? '  ·  ' : ''}
          {product.rating != null && <Rating value={product.rating} count={product.reviewCount} />}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
            <Text style={{ fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
              {product.price} ر.س
            </Text>
            {!!product.compareAtPrice && (
              <Text style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, textDecorationLine: 'line-through' }}>
                {product.compareAtPrice}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="أضف إلى السلة"
            onPress={onAddToCart}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>+</Text>
          </Pressable>
        </View>
      </Surface>
    </Pressable>
  );
}

export type Store = { id: string; name: string; rating: number; followers?: number; verified?: boolean };

/** Compact store identity card used in listings and search results. */
export function StoreCard({ store, onPress }: { store: Store; onPress?: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 4, width: 96 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      />
      <Text numberOfLines={1} style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, textAlign: 'center' }}>
        {store.name}{store.verified ? ' ✓' : ''}
      </Text>
      <Rating value={store.rating} />
    </Pressable>
  );
}

/** Two-column responsive grid for ProductCard, with a stable keyExtractor. */
export function ProductGrid({
  products,
  onPressProduct,
  onToggleFavorite,
  onAddToCart,
}: {
  products: Product[];
  onPressProduct?: (p: Product) => void;
  onToggleFavorite?: (p: Product, next: boolean) => void;
  onAddToCart?: (p: Product) => void;
}) {
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard
            product={item}
            onPress={() => onPressProduct?.(item)}
            onToggleFavorite={(v) => onToggleFavorite?.(item, v)}
            onAddToCart={() => onAddToCart?.(item)}
          />
        </View>
      )}
    />
  );
}
