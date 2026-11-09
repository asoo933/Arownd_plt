import { router, usePathname } from "expo-router";

import { BottomNavigation, Icon } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";
import { useAppTheme } from "@/lib/theme";

const tabs: {
  id: Exclude<CustomerTab, "none">;
  label: "navHome" | "navExplore" | "navCart" | "navAccount";
  icon: "home" | "search" | "shopping-cart" | "user";
  path: string;
}[] = [
  { id: "home", label: "navHome", icon: "home", path: "/home" },
  { id: "explore", label: "navExplore", icon: "search", path: "/explore" },
  { id: "cart", label: "navCart", icon: "shopping-cart", path: "/cart" },
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
      value={activeTab === "none" ? "" : activeTab}
      onChange={(key) => {
        const destination = tabs.find((tab) => tab.id === key)?.path;
        if (destination && pathname !== destination) router.replace(destination);
      }}
      items={tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return {
          key: tab.id,
          label: translate(tab.label),
          icon: (
            <Icon
              name={tab.icon}
              size={22}
              color={selected ? theme.colors.accentMuted : theme.colors.muted}
              fill={selected ? theme.colors.accentMuted : "none"}
              strokeWidth={selected ? 2 : 1.8}
              accessibilityHidden
            />
          )
        };
      })}
    />
  );
}
