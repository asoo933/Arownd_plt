import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';
import { Surface } from './foundation';
import { Badge } from './feedback';

/** Single KPI tile for the merchant dashboard grid. */
export function DashboardStatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
}) {
  const { theme } = useTheme();
  return (
    <Surface radius="lg" style={{ gap: 6, flex: 1 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>{label}</Text>
      <Text style={{ fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        {value}
      </Text>
      {!!delta && (
        <Text style={{ color: delta.positive ? theme.colors.success : theme.colors.error, fontSize: theme.typography.sizes.xs }}>
          {delta.positive ? '▲' : '▼'} {delta.value}
        </Text>
      )}
    </Surface>
  );
}

type OrderState = 'new' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
const ORDER_LABELS: Record<OrderState, string> = {
  new: 'طلب جديد',
  preparing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};
const ORDER_TONES: Record<OrderState, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  new: 'primary',
  preparing: 'warning',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'error',
};

/** Colored status pill for a merchant order row. */
export function OrderStatusBadge({ state }: { state: OrderState }) {
  return <Badge label={ORDER_LABELS[state]} tone={ORDER_TONES[state]} />;
}

/** Earnings-to-date card with a payout action, for the merchant finance tab. */
export function EarningsCard({
  amount,
  period,
  onWithdraw,
}: {
  amount: number;
  period: string;
  onWithdraw?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Surface radius="lg" style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>الأرباح · {period}</Text>
      <Text style={{ fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        {amount} ر.س
      </Text>
      <Text onPress={onWithdraw} style={{ color: theme.colors.text, fontWeight: theme.typography.weights.semibold, textDecorationLine: 'underline' }}>
        طلب سحب الرصيد
      </Text>
    </Surface>
  );
}
