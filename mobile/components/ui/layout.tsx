import type { PropsWithChildren } from "react";
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";

export type ContainerProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  paddingHorizontal?: number;
  maxWidth?: number;
  centered?: boolean;
}>;

export function Container({
  children,
  style,
  paddingHorizontal = designTokens.spacing.lg,
  maxWidth,
  centered = false
}: ContainerProps) {
  return (
    <View
      style={[
        { width: "100%", paddingHorizontal, maxWidth, alignSelf: centered ? "center" : "auto" },
        style
      ]}
    >
      {children}
    </View>
  );
}

export type StackProps = PropsWithChildren<{
  direction?: "row" | "column";
  gap?: number;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Stack({
  children,
  direction = "column",
  gap = designTokens.spacing.md,
  align,
  justify,
  wrap = false,
  style
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction === "row" ? "row" : "column",
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap"
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

export type RowProps = Omit<StackProps, "direction">;
export function Row(props: RowProps) {
  return <Stack {...props} direction="row" />;
}

export type ColumnProps = Omit<StackProps, "direction">;
export function Column(props: ColumnProps) {
  return <Stack {...props} direction="column" />;
}

export function Spacer({ size = 1 }: { size?: number }) {
  return <View style={{ flex: size }} />;
}

export function Divider({
  inset = 0,
  style
}: {
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      style={[
        { height: 1, alignSelf: "stretch", marginHorizontal: inset, backgroundColor: theme.colors.border },
        style
      ]}
    />
  );
}

export function AspectRatio({
  children,
  ratio = 1,
  style
}: PropsWithChildren<{ ratio?: number; style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ width: "100%", aspectRatio: ratio }, style]}>{children}</View>;
}

export type ScrollAreaProps = PropsWithChildren<
  Pick<ScrollViewProps, "horizontal" | "showsHorizontalScrollIndicator" | "showsVerticalScrollIndicator" | "onScroll" | "refreshControl" | "keyboardShouldPersistTaps"> & {
    contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
    style?: ScrollViewProps["style"];
  }
>;

export function ScrollArea({
  children,
  horizontal = false,
  showsHorizontalScrollIndicator = false,
  showsVerticalScrollIndicator = false,
  contentContainerStyle,
  style,
  onScroll,
  refreshControl,
  keyboardShouldPersistTaps = "handled"
}: ScrollAreaProps) {
  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentContainerStyle={contentContainerStyle}
      style={style}
      onScroll={onScroll}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
}
