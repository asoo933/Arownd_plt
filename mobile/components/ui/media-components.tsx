import type { ReactNode } from "react";
import {
  Image as NativeImage,
  Modal,
  Pressable,
  ScrollView,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Icon } from "./icon";

export function Image({
  uri,
  source,
  accessibilityLabel,
  aspectRatio = 1,
  resizeMode = "cover",
  style
}: {
  uri?: string;
  source?: ImageSourcePropType;
  accessibilityLabel: string;
  aspectRatio?: number;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  style?: StyleProp<ImageStyle>;
}) {
  const theme = useAppTheme();
  const imageSource = source ?? (uri ? { uri } : undefined);
  if (!imageSource) return <View accessibilityLabel={accessibilityLabel} style={[{ width: "100%", aspectRatio, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted }, style as StyleProp<ViewStyle>]} />;
  return <NativeImage accessibilityLabel={accessibilityLabel} source={imageSource} resizeMode={resizeMode} style={[{ width: "100%", aspectRatio, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted }, style]} />;
}

export function ImageGallery({
  images,
  selectedIndex,
  onSelect,
  accessibilityLabel
}: {
  images: Array<{ key: string; uri: string; label: string }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ gap: designTokens.spacing.sm }}>
      <Image uri={images[selectedIndex]?.uri} accessibilityLabel={images[selectedIndex]?.label ?? accessibilityLabel} aspectRatio={1} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: designTokens.spacing.sm }}>
        {images.map((image, index) => <Pressable key={image.key} accessibilityRole="button" accessibilityLabel={image.label} accessibilityState={{ selected: index === selectedIndex }} onPress={() => onSelect(index)} style={{ borderWidth: index === selectedIndex ? 2 : 1, borderColor: index === selectedIndex ? theme.colors.accentMuted : theme.colors.border, borderRadius: theme.radius.md, overflow: "hidden" }}><NativeImage source={{ uri: image.uri }} style={{ width: 60, height: 60 }} /></Pressable>)}
      </ScrollView>
    </View>
  );
}

export function ImagePreview({
  visible,
  uri,
  accessibilityLabel,
  onRequestClose
}: {
  visible: boolean;
  uri: string;
  accessibilityLabel: string;
  onRequestClose: () => void;
}) {
  const theme = useAppTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onRequestClose} style={{ flex: 1, justifyContent: "center", padding: designTokens.spacing.md, backgroundColor: theme.colors.overlay }}><NativeImage source={{ uri }} resizeMode="contain" style={{ width: "100%", height: "80%" }} /></Pressable></Modal>;
}

export function CameraButton({
  children,
  onPress,
  accessibilityLabel,
  disabled = false
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.72 : 1 })}>{children}</Pressable>;
}

export function MediaViewer({
  visible,
  onRequestClose,
  children,
  closeLabel
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  closeLabel: string;
}) {
  const theme = useAppTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}><View style={{ flex: 1, padding: designTokens.spacing.md, backgroundColor: theme.colors.overlay, justifyContent: "center" }}><Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onRequestClose} style={{ alignSelf: "flex-end", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={22} color={theme.colors.surface} accessibilityHidden /></Pressable>{children}</View></Modal>;
}
