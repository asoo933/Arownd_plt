import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router, usePathname } from "expo-router";

import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";

const tabs: { id: CustomerTab; label: "navHome" | "navExplore" | "navStores" | "favoriteTitleShort" | "navAccount"; icon: string; path: string }[] = [
  { id: "home", label: "navHome", icon: "⌂", path: "/home" },
  { id: "explore", label: "navExplore", icon: "⌕", path: "/explore" },
  { id: "stores", label: "navStores", icon: "▦", path: "/stores" },
  { id: "favorites", label: "favoriteTitleShort", icon: "♡", path: "/favorites" },
  { id: "profile", label: "navAccount", icon: "◎", path: "/profile" }
];

export function CustomerNavigation() {
  const pathname = usePathname();
  const dark = useColorScheme() === "dark";
  const activeTab = getCustomerTab(pathname);

  if (!activeTab) return null;

  return (
    <View style={[styles.container, { backgroundColor: dark ? "#171717" : "#FFFFFF", borderTopColor: dark ? "#303030" : "#E8E8E8" }]} accessibilityRole="tablist">
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
            <Text style={[styles.icon, active && styles.active]}>{tab.icon}</Text>
            <Text numberOfLines={1} style={[styles.label, active && styles.active]}>{translate(tab.label)}</Text>
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
    paddingHorizontal: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  icon: { color: "#858585", fontSize: 21, fontWeight: "700" },
  label: { color: "#858585", fontSize: 10, fontWeight: "700" },
  active: { color: "#718B17" }
});
