import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";

import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";
import { designTokens, useAppTheme } from "@/lib/theme";

const tabs: { id: CustomerTab; label: "navHome" | "navExplore" | "navStores" | "favoriteTitleShort" | "navAccount"; icon: string; path: string }[] = [
  { id: "home", label: "navHome", icon: "⌂", path: "/home" },
  { id: "explore", label: "navExplore", icon: "⌕", path: "/explore" },
  { id: "stores", label: "navStores", icon: "▦", path: "/stores" },
  { id: "favorites", label: "favoriteTitleShort", icon: "♡", path: "/favorites" },
  { id: "profile", label: "navAccount", icon: "◎", path: "/profile" }
];

export function CustomerNavigation() {
  const pathname = usePathname();
  const theme = useAppTheme();
  const activeTab = getCustomerTab(pathname);

  if (!activeTab) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={translate(tab.label)}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (pathname !== tab.path) router.replace(tab.path);
            }}
            style={styles.item}
          >
            <Text style={[styles.icon, { color: active ? theme.colors.accentMuted : theme.colors.muted }]}>{tab.icon}</Text>
            <Text numberOfLines={1} style={[styles.label, { color: active ? theme.colors.accentMuted : theme.colors.muted }]}>{translate(tab.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  icon: { fontSize: 21, fontWeight: "700" },
  label: { fontSize: 10, fontWeight: "700" }
});
