import React from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '../theme';
import { Surface } from './foundation';
import { Button } from './actions';

/** Circular avatar with optional verified badge and online dot. */
export function Avatar({
  uri,
  size = 44,
  verified,
  online,
}: {
  uri?: string;
  size?: number;
  verified?: boolean;
  online?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
        {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />}
      </View>
      {verified && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            end: 0,
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.2, color: theme.colors.onPrimary }}>✓</Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            end: 0,
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: theme.colors.success,
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        />
      )}
    </View>
  );
}

/** Name + role/subtext row paired with an avatar, used in profile headers and lists. */
export function UserCard({
  name,
  subtitle,
  avatarUri,
  verified,
}: {
  name: string;
  subtitle?: string;
  avatarUri?: string;
  verified?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar uri={avatarUri} size={56} verified={verified} />
      <View>
        <Text style={{ fontWeight: theme.typography.weights.bold, color: theme.colors.text, fontSize: theme.typography.sizes.md }}>
          {name}
        </Text>
        {!!subtitle && <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>{subtitle}</Text>}
      </View>
    </View>
  );
}

/** Wallet balance card for the account tab. */
export function WalletCard({ balance, onTopUp }: { balance: number; onTopUp?: () => void }) {
  const { theme } = useTheme();
  return (
    <Surface radius="lg" style={{ gap: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>رصيد المحفظة</Text>
      <Text style={{ fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        {balance} ر.س
      </Text>
      <Button label="+ إضافة رصيد" variant="outline" size="sm" onPress={onTopUp} />
    </Surface>
  );
}
