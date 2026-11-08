import {
  Image,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/lib/theme";
import { Text as UiText } from "./typography";
import { getIdentityInitials } from "./identity-state";
import { Icon } from "./icon";

export type AvatarProps = {
  name: string;
  imageUri?: string;
  size?: number;
  verified?: boolean;
  online?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({
  name,
  imageUri,
  size = 44,
  verified = false,
  online = false,
  accessibilityLabel,
  style
}: AvatarProps) {
  const theme = useAppTheme();
  const imageSource: ImageSourcePropType | undefined = imageUri ? { uri: imageUri } : undefined;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name}
      style={[{ width: size, height: size }, style]}
    >
      <View
        style={{
          width: size,
          height: size,
          overflow: "hidden",
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceMuted
        }}
      >
        {imageSource ? (
          <Image source={imageSource} resizeMode="cover" style={{ width: size, height: size }} />
        ) : (
          <UiText
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              fontSize: Math.max(12, size * 0.32),
              fontWeight: "700"
            }}
          >
            {getIdentityInitials(name)}
          </UiText>
        )}
      </View>
      {verified ? (
        <View
          accessibilityElementsHidden
          style={{
            position: "absolute",
            end: 0,
            bottom: 0,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.accent,
            borderWidth: 2,
            borderColor: theme.colors.surface
          }}
        >
          <Icon name="check" size={Math.max(10, size * 0.18)} color={theme.colors.accentForeground} accessibilityHidden />
        </View>
      ) : null}
      {online ? (
        <View
          accessibilityElementsHidden
          style={{
            position: "absolute",
            end: 0,
            top: 0,
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.success,
            borderWidth: 2,
            borderColor: theme.colors.surface
          }}
        />
      ) : null}
    </View>
  );
}

export function IdentityRow({
  name,
  subtitle,
  imageUri,
  verified = false,
  avatarSize = 48,
  style
}: {
  name: string;
  subtitle?: string;
  imageUri?: string;
  verified?: boolean;
  avatarSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }, style]}>
      <Avatar name={name} imageUri={imageUri} size={avatarSize} verified={verified} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <UiText
          numberOfLines={1}
          style={{ color: theme.colors.foreground, fontSize: theme.typography.subtitle, fontWeight: "700", textAlign: "right" }}
        >
          {name}
        </UiText>
        {subtitle ? (
          <UiText
            numberOfLines={2}
            style={{ color: theme.colors.muted, fontSize: theme.typography.caption + 1, textAlign: "right" }}
          >
            {subtitle}
          </UiText>
        ) : null}
      </View>
    </View>
  );
}
