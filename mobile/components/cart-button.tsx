import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "react-native";

import { Button } from "@/components/ui";
import { CART_QUERY_KEY, getCart } from "@/lib/cart";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export function CartButton() {
  const theme = useAppTheme();
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const count = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Button
      label={translate("cartTitle")}
      onPress={() => router.push("/cart")}
      size="sm"
      startIcon={<Text style={{ color: theme.colors.accentForeground, fontSize: 19, fontWeight: "900" }}>▱</Text>}
      endIcon={count > 0 ? (
        <Text style={{
          minWidth: 19,
          height: 19,
          borderRadius: 10,
          overflow: "hidden",
          textAlign: "center",
          textAlignVertical: "center",
          backgroundColor: theme.colors.foreground,
          color: theme.colors.accent,
          fontSize: 10,
          fontWeight: "900"
        }}>{count > 99 ? "99+" : count}</Text>
      ) : undefined}
      textStyle={{ fontSize: 11 }}
      style={{ minHeight: 42, paddingHorizontal: 10, borderRadius: 13 }}
    />
  );
}
