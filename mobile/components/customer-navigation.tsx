import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { router, usePathname } from "expo-router";

import { BottomNavigation, Icon, Text as UiText } from "@/components/ui";
import { fetchMerchantAccess } from "@/lib/merchant";
import { translate } from "@/lib/i18n";
import { getCustomerTab, type CustomerTab } from "@/lib/customer-navigation-state";
import { useAppTheme } from "@/lib/theme";
import { CART_QUERY_KEY, getCart } from "@/lib/cart";

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
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const cartCount = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
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
            <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
              <Icon
                name={tab.icon}
                size={22}
                color={selected ? theme.colors.accent : theme.colors.muted}
                fill="none"
                strokeWidth={selected ? 2.1 : 1.8}
                accessibilityHidden
              />
              {tab.id === "cart" && cartCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    end: -5,
                    minWidth: 17,
                    height: 17,
                    paddingHorizontal: 4,
                    borderRadius: theme.radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.danger
                  }}
                >
                  <UiText style={{ color: theme.colors.surface, fontSize: 9, fontWeight: theme.fontWeights.extrabold, fontVariant: ["tabular-nums"] }}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </UiText>
                </View>
              ) : null}
            </View>
          )
        };
      })}
    />
  );
}
