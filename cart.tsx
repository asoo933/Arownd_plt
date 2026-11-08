import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme';
import { QuantitySelector, Input } from './forms';
import { Button } from './actions';
import { Surface } from './foundation';

export type CartLine = { id: string; title: string; storeName: string; price: number; quantity: number };

/** One line in the cart: thumbnail slot, title/store, quantity stepper, line total. */
export function CartItem({
  item,
  onChangeQuantity,
  onRemove,
}: {
  item: CartLine;
  onChangeQuantity: (qty: number) => void;
  onRemove?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.surfaceAlt }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.base }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs }}>{item.storeName}</Text>
      </View>
      <QuantitySelector value={item.quantity} onChange={onChangeQuantity} />
      <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weights.semibold, minWidth: 56, textAlign: 'left' }}>
        {item.price * item.quantity} ر.س
      </Text>
    </View>
  );
}

/** Subtotal / shipping / total breakdown, shown above checkout. */
export function CartSummary({
  subtotal,
  shipping,
  discount = 0,
}: {
  subtotal: number;
  shipping: number;
  discount?: number;
}) {
  const { theme } = useTheme();
  const total = subtotal + shipping - discount;
  const row = (label: string, value: string, bold?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: bold ? 0 : 1, borderBottomColor: theme.colors.border }}>
      <Text style={{ color: bold ? theme.colors.text : theme.colors.textSecondary, fontWeight: bold ? theme.typography.weights.bold : theme.typography.weights.regular }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.text, fontWeight: bold ? theme.typography.weights.bold : theme.typography.weights.regular }}>{value}</Text>
    </View>
  );
  return (
    <View>
      {row('المجموع الفرعي', `${subtotal} ر.س`)}
      {row('الشحن', shipping === 0 ? 'مجاني' : `${shipping} ر.س`)}
      {discount > 0 && row('الخصم', `−${discount} ر.س`)}
      {row('الإجمالي', `${total} ر.س`, true)}
    </View>
  );
}

/** Coupon code field with an inline apply button and applied state. */
export function CouponInput({ onApply }: { onApply: (code: string) => void }) {
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Input placeholder="كود الخصم" value={code} onChangeText={setCode} glyph="🏷" />
      </View>
      <Button
        label={applied ? 'مطبّق' : 'تطبيق'}
        variant={applied ? 'outline' : 'primary'}
        size="sm"
        disabled={!code}
        onPress={() => {
          setApplied(true);
          onApply(code);
        }}
      />
    </View>
  );
}

export type PaymentMethod = { id: string; label: string; glyph: string };

/** Selectable row for a saved or available payment method. */
export function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
      }}
    >
      <Text style={{ fontSize: 18 }}>{method.glyph}</Text>
      <Text style={{ flex: 1, color: theme.colors.text }}>{method.label}</Text>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
        }}
      />
    </Pressable>
  );
}

/** Final itemized order summary shown before payment confirmation. */
export function OrderSummary({
  items,
  total,
}: {
  items: { label: string; value: string }[];
  total: string;
}) {
  const { theme } = useTheme();
  return (
    <Surface radius="lg">
      {items.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <Text style={{ color: theme.colors.textSecondary }}>{row.label}</Text>
          <Text style={{ color: theme.colors.text }}>{row.value}</Text>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weights.bold }}>الإجمالي</Text>
        <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weights.bold }}>{total}</Text>
      </View>
    </Surface>
  );
}

/** Numbered checkout progress: address → shipping → payment, etc. */
export function CheckoutSteps({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: i === activeIndex ? '#FACAFF' : theme.colors.border,
              backgroundColor: i === activeIndex ? '#FACAFF' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, color: i === activeIndex ? '#111' : theme.colors.textSecondary }}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>
        الخطوة {activeIndex + 1} من {steps.length}: {steps[activeIndex]}
      </Text>
    </View>
  );
}

/** Confirmation screen content after a successful order placement. */
export function OrderSuccess({ orderNumber, onTrack }: { orderNumber: string; onTrack?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 16, padding: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 30, color: theme.colors.onPrimary }}>✓</Text>
      </View>
      <Text style={{ fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        تم تأكيد طلبك
      </Text>
      <Text style={{ color: theme.colors.textSecondary }}>رقم الطلب #{orderNumber}</Text>
      <Button label="تتبّع الطلب" onPress={onTrack} fullWidth />
    </View>
  );
}
