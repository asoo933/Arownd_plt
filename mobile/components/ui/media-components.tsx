import type { ReactNode } from "react";
import {
  Image as NativeImage,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { SearchField } from "./extended";
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

export function ImageUploader({
  children,
  onPress,
  accessibilityLabel,
  disabled = false,
  style
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: 112, alignItems: "center", justifyContent: "center", padding: designTokens.spacing.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: theme.colors.border, borderRadius: theme.radius.xl, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, style]}>{children}</Pressable>;
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

export function FileUploader({
  children,
  progress,
  onCancel,
  cancelLabel,
  style
}: {
  children: ReactNode;
  progress?: number;
  onCancel?: () => void;
  cancelLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const safeProgress = progress === undefined ? undefined : Math.min(100, Math.max(0, progress));
  return (
    <View style={[{ padding: designTokens.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: designTokens.spacing.sm }, style]}>
      {children}
      {safeProgress !== undefined ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: safeProgress }} style={{ height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, overflow: "hidden" }}><View style={{ width: `${safeProgress}%`, height: "100%", backgroundColor: theme.colors.accentMuted }} /></View> : null}
      {onCancel && cancelLabel ? <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} hitSlop={8}><Text style={{ color: theme.colors.danger, textAlign: "right" }}>{cancelLabel}</Text></Pressable> : null}
    </View>
  );
}

export function ImageSearch({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <SearchField value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={accessibilityLabel} style={style} />;
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
