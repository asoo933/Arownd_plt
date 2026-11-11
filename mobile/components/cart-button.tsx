import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CartButton as UiCartButton, Icon } from "@/components/ui";
import { CART_QUERY_KEY, getCart } from "@/lib/cart";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export function CartButton() {
  const theme = useAppTheme();
  const cart = useQuery({ queryKey: CART_QUERY_KEY, queryFn: getCart });
  const count = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <UiCartButton
      label={translate("cartTitle") + (count > 0 ? `, ${count}` : "")}
      count={count}
      onPress={() => router.push("/cart")}
    >
      <Icon name="shopping-cart" size={22} color={theme.colors.foreground} accessibilityHidden />
    </UiCartButton>
  );
}
