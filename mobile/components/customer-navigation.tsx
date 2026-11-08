import { router, usePathname } from "expo-router";

import { BottomNavigation, Icon } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";
import { useAppTheme } from "@/lib/theme";

const tabs: {
  id: CustomerTab;
  label: "navHome" | "navExplore" | "navStores" | "favoriteTitleShort" | "navAccount";
  icon: "home" | "search" | "store" | "heart" | "user";
  path: string;
}[] = [
  { id: "home", label: "navHome", icon: "home", path: "/home" },
  { id: "explore", label: "navExplore", icon: "search", path: "/explore" },
  { id: "stores", label: "navStores", icon: "store", path: "/stores" },
  { id: "favorites", label: "favoriteTitleShort", icon: "heart", path: "/favorites" },
  { id: "profile", label: "navAccount", icon: "user", path: "/profile" }
];

export function CustomerNavigation() {
  const pathname = usePathname();
  const theme = useAppTheme();
  const activeTab = getCustomerTab(pathname);

  if (!activeTab) return null;

  return (
    <BottomNavigation
      accessibilityLabel={translate("navMain")}
      value={activeTab}
      onChange={(key) => {
        const destination = tabs.find((tab) => tab.id === key)?.path;
        if (destination && pathname !== destination) router.replace(destination);
      }}
      items={tabs.map((tab) => ({
        key: tab.id,
        label: translate(tab.label),
        icon: (
          <Icon
            name={tab.icon}
            size={21}
            color={activeTab === tab.id ? theme.colors.accentMuted : theme.colors.muted}
            accessibilityHidden
          />
        )
      }))}
    />
  );
}
