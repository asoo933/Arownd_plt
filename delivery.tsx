import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';
import { Surface } from './foundation';

type DeliveryState = 'confirmed' | 'preparing' | 'on_the_way' | 'delivered';

const LABELS: Record<DeliveryState, string> = {
  confirmed: 'تم تأكيد الطلب',
  preparing: 'يتم التجهيز',
  on_the_way: 'في الطريق إليك',
  delivered: 'تم التسليم',
};

/** Single current-status line with a colored dot, used atop the tracking screen. */
export function DeliveryStatus({ state, eta }: { state: DeliveryState; eta?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />
      <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weights.semibold }}>{LABELS[state]}</Text>
      {!!eta && <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>· يصل {eta}</Text>}
    </View>
  );
}

export type TrackingStep = { label: string; time?: string; done: boolean };

/** Vertical step list showing every stage an order has passed through. */
export function TrackingTimeline({ steps }: { steps: TrackingStep[] }) {
  const { theme } = useTheme();
  return (
    <View>
      {steps.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center', width: 20 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: step.done ? theme.colors.primary : theme.colors.border,
              }}
            />
            {i < steps.length - 1 && (
              <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: step.done ? theme.colors.primary : theme.colors.border }} />
            )}
          </View>
          <View style={{ paddingBottom: 18, flex: 1 }}>
            <Text style={{ color: step.done ? theme.colors.text : theme.colors.textSecondary, fontWeight: step.done ? '600' : '400' }}>
              {step.label}
            </Text>
            {!!step.time && <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs }}>{step.time}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Driver identity + contact actions, shown during active delivery. */
export function DriverCard({
  name,
  vehicle,
  onCall,
  onMessage,
}: {
  name: string;
  vehicle?: string;
  onCall?: () => void;
  onMessage?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Surface radius="lg" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceAlt }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weights.semibold }}>{name}</Text>
        {!!vehicle && <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs }}>{vehicle}</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Text onPress={onMessage} style={{ fontSize: 18 }}>💬</Text>
        <Text onPress={onCall} style={{ fontSize: 18 }}>📞</Text>
      </View>
    </Surface>
  );
}
