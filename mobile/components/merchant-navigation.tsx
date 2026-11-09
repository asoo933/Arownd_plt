import { useQuery } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";

import { BottomNavigation, Icon } from "@/components/ui";
import { fetchMerchantAccess } from "@/lib/merchant";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

const tabs = [
  { key: "home", label: "navHome", icon: "home", path: "/home" },
  { key: "explore", label: "navExplore", icon: "search", path: "/explore" },
  { key: "cart", label: "navCart", icon: "shopping-cart", path: "/cart" },
  { key: "studio", label: "navStudio", icon: "store", path: "/merchant" }
] as const;

export function MerchantNavigation() {
  const pathname = usePathname();
  const theme = useAppTheme();
  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  if (access.data?.status !== "merchant_ready" || !access.data.store?.id) return null;

  return (
    <BottomNavigation
      accessibilityLabel={translate("navMain")}
      value="studio"
      onChange={(key) => {
        const destination = tabs.find((tab) => tab.key === key)?.path;
        if (destination && pathname !== destination) router.replace(destination);
      }}
      items={tabs.map((tab) => ({
        key: tab.key,
        label: translate(tab.label),
        icon: (
          <Icon
            name={tab.icon}
            size={22}
            color={theme.colors.accentMuted}
            fill={theme.colors.accentMuted}
            strokeWidth={2}
            accessibilityHidden
          />
        )
      }))}
    />
  );
}
