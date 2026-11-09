import { useQuery } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";

import { BottomNavigation, Icon } from "@/components/ui";
import { fetchMerchantAccess } from "@/lib/merchant";
import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";
import { useAppTheme } from "@/lib/theme";

type NavigationTab = {
  id: Exclude<CustomerTab, "none"> | "studio";
  label: "navHome" | "navExplore" | "navCart" | "navAccount" | "navStudio";
  icon: "home" | "search" | "shopping-cart" | "user" | "store";
  path: string;
};

const customerTabs: NavigationTab[] = [
  { id: "home", label: "navHome", icon: "home", path: "/home" },
  { id: "explore", label: "navExplore", icon: "search", path: "/explore" },
  { id: "cart", label: "navCart", icon: "shopping-cart", path: "/cart" },
  { id: "profile", label: "navAccount", icon: "user", path: "/profile" }
];

const merchantTabs: NavigationTab[] = [
  { id: "home", label: "navHome", icon: "home", path: "/home" },
  { id: "explore", label: "navExplore", icon: "search", path: "/explore" },
  { id: "cart", label: "navCart", icon: "shopping-cart", path: "/cart" },
  { id: "studio", label: "navStudio", icon: "store", path: "/merchant" }
];

export function CustomerNavigation() {
  const pathname = usePathname();
  const theme = useAppTheme();
  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });
  const isMerchant = access.data?.status === "merchant_ready" || access.data?.status === "merchant_setup_required";
  const isMerchantRoute = pathname.startsWith("/merchant");
  const tabs = isMerchant ? merchantTabs : customerTabs;
  const activeTab = isMerchantRoute ? "studio" : getCustomerTab(pathname);
  const selectedTab = isMerchant && (isMerchantRoute || activeTab === "profile") ? "studio" : activeTab;

  if (access.isPending || !activeTab || (isMerchantRoute && !isMerchant)) return null;

  return (
    <BottomNavigation
      accessibilityLabel={translate("navMain")}
      value={selectedTab === "none" ? "" : selectedTab ?? ""}
      onChange={(key) => {
        const destination = tabs.find((tab) => tab.id === key)?.path;
        if (destination && pathname !== destination) router.replace(destination);
      }}
      items={tabs.map((tab) => {
        const selected = selectedTab === tab.id;
        return {
          key: tab.id,
          label: translate(tab.label),
          icon: (
            <Icon
              name={tab.icon}
              size={22}
              color={selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : theme.colors.muted}
              fill={selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : "none"}
              strokeWidth={selected ? 2 : 1.8}
              accessibilityHidden
            />
          )
        };
      })}
    />
  );
}
